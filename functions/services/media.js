import { FieldPath } from 'firebase-admin/firestore';
import {
  db,
  bucket,
  uid as newId,
  future,
  stamp,
  audit,
  actorFor,
  guestUid,
  read,
} from './context.js';
import { accessRef } from './guests.js';
import { need, id, text, integer, choice, IMAGE_TYPES, imageType } from '../lib/validation.js';
import { requireUpload, requireConsent, requireOwner } from '../lib/policy.js';

export async function authorizeUpload(request, data) {
  const uid = guestUid(request);
  const eventId = id(data.eventId);
  const requestId = id(data.requestId);
  const name = text(data.name, 'Nombre', 100);
  need(
    Array.isArray(data.files) && data.files.length > 0 && data.files.length <= 50,
    'Selecciona de 1 a 50 fotos.',
  );
  const files = data.files.map((f) => ({
    name: text(f.name, 'Archivo', 200),
    size: integer(f.size, 1, 2097152, 'Tamaño'),
    type: choice(f.type, IMAGE_TYPES, 'Formato (JPEG, PNG o WebP)'),
  }));
  return db.runTransaction(async (tx) => {
    const event = await read(tx, 'events', eventId);
    const access = await tx.get(accessRef(eventId, uid));
    requireUpload(event.data, access.data());
    need(files.length <= event.data.config.upload.maxFiles, 'Exceso de archivos.');
    const batchRef = db.doc(`upload_batches/${eventId}_${uid}_${requestId}`);
    const previous = await tx.get(batchRef);
    if (previous.exists) {
      need(
        JSON.stringify(previous.data().files) === JSON.stringify(files),
        'La solicitud ya existe con otros archivos.',
      );
      return { tickets: previous.data().tickets };
    }
    need(
      !access.data().nextUploadAt || access.data().nextUploadAt.toMillis() <= Date.now(),
      'Espera antes de otra carga.',
      'resource-exhausted',
    );
    need(
      (access.data().reservedPhotos ?? 0) + files.length <= 200,
      'Límite de fotos por invitado alcanzado.',
      'resource-exhausted',
    );
    const bytes = files.reduce((n, f) => n + f.size, 0);
    need(
      event.data.reservedPhotos + files.length <= event.data.maxPhotos &&
        event.data.reservedBytes + bytes <= event.data.maxBytes,
      'El evento ha alcanzado su cuota.',
      'resource-exhausted',
    );
    const tickets = files.map((f) => ({ id: newId(), ...f }));
    for (const ticket of tickets) {
      tx.create(db.doc(`media/${ticket.id}`), {
        eventId,
        ownerUid: uid,
        uploaderName: name,
        originalName: ticket.name,
        size: ticket.size,
        contentType: ticket.type,
        path: `events/${eventId}/${uid}/${ticket.id}`,
        status: 'reserved',
        uploadEpoch: event.data.uploadEpoch,
        privacyRevision: event.data.privacyRevision,
        expiresAt: future(15 * 60 * 1000),
        createdAt: stamp(),
      });
    }
    tx.create(batchRef, { files, tickets, createdAt: stamp() });
    tx.update(event.ref, {
      reservedPhotos: event.data.reservedPhotos + files.length,
      reservedBytes: event.data.reservedBytes + bytes,
    });
    tx.set(
      accessRef(eventId, uid),
      {
        reservedPhotos: (access.data().reservedPhotos ?? 0) + files.length,
        nextUploadAt: future(event.data.config.upload.cooldownMs),
      },
      { merge: true },
    );
    audit(tx, uid, 'upload.authorized', eventId, { count: files.length, bytes });
    return { tickets };
  });
}

export async function uploadPhoto(request, data) {
  const uid = guestUid(request);
  const mediaId = id(data.mediaId);
  need(
    typeof data.base64 === 'string' &&
      data.base64.length <= 2796204 &&
      /^[A-Za-z0-9+/]*={0,2}$/.test(data.base64),
    'Contenido inválido.',
  );
  const bytes = Buffer.from(data.base64, 'base64');
  const ticket = await db.runTransaction(async (tx) => {
    const media = await read(tx, 'media', mediaId);
    need(media.data.ownerUid === uid, 'Carga no autorizada.', 'permission-denied');
    const event = await read(tx, 'events', media.data.eventId);
    const access = await tx.get(accessRef(event.data.id, uid));
    requireUpload(event.data, access.data());
    if (media.data.status === 'ready') return { ...media.data, alreadyUploaded: true };
    need(
      media.data.status === 'reserved' &&
        media.data.expiresAt.toMillis() > Date.now() &&
        media.data.uploadEpoch === event.data.uploadEpoch,
      'Autorización expirada o ya utilizada. Selecciona de nuevo.',
      'failed-precondition',
    );
    need(
      bytes.length === media.data.size && imageType(bytes) === media.data.contentType,
      'El archivo no coincide con la autorización.',
    );
    tx.update(media.ref, { status: 'uploading', startedAt: stamp() });
    return media.data;
  });
  if (ticket.alreadyUploaded) return { id: mediaId };
  try {
    // Admin SDK creates a private object without Firebase download tokens.
    await bucket()
      .file(ticket.path)
      .save(bytes, {
        resumable: false,
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
          contentType: ticket.contentType,
          cacheControl: 'private, no-store',
          metadata: { eventId: ticket.eventId, ownerUid: uid },
        },
      });
    await db.runTransaction(async (tx) => {
      const event = await read(tx, 'events', ticket.eventId);
      const access = await tx.get(accessRef(ticket.eventId, uid));
      requireUpload(event.data, access.data());
      need(
        event.data.uploadEpoch === ticket.uploadEpoch,
        'Permisos cambiaron durante la carga.',
        'failed-precondition',
      );
      tx.update(db.doc(`media/${mediaId}`), { status: 'ready', uploadedAt: stamp() });
      audit(tx, uid, 'media.uploaded', mediaId, { eventId: ticket.eventId });
    });
  } catch (error) {
    // Preserve the object for review; never expose or automatically delete failed uploads.
    await db.doc(`media/${mediaId}`).update({ status: 'quarantined', failedAt: stamp() });
    throw error;
  }
  return { id: mediaId };
}

export async function canReadMedia(request, media) {
  const uid = guestUid(request);
  const event = await read(null, 'events', media.eventId);
  const actor = await actorFor(request);
  if (
    ['superadmin', 'seller'].includes(actor.role) &&
    actor.enabled &&
    actor.provider !== 'anonymous'
  ) {
    requireOwner(actor, event.data);
    return;
  }
  need(
    media.status === 'ready' && ['active', 'closed'].includes(event.data.status),
    'Foto no disponible.',
    'permission-denied',
  );
  need(
    event.data.galleryEnabled || uid === media.ownerUid,
    'Galería privada.',
    'permission-denied',
  );
  const access = await accessRef(event.data.id, uid).get();
  requireConsent(event.data, access.data());
  const ownerAccess =
    uid === media.ownerUid ? access : await accessRef(event.data.id, media.ownerUid).get();
  requireConsent(event.data, ownerAccess.data());
}

export async function listMedia(request, data) {
  const uid = guestUid(request);
  const eventId = id(data.eventId);
  const event = await read(null, 'events', eventId);
  const actor = await actorFor(request);
  const staff =
    actor.enabled &&
    actor.provider !== 'anonymous' &&
    ['superadmin', 'seller'].includes(actor.role);
  if (staff) requireOwner(actor, event.data);
  else {
    need(
      ['active', 'closed'].includes(event.data.status),
      'Evento no disponible.',
      'permission-denied',
    );
    const access = await accessRef(eventId, uid).get();
    requireConsent(event.data, access.data());
    need(event.data.galleryEnabled || data.mine === true, 'Galería privada.', 'permission-denied');
  }
  let query = db
    .collection('media')
    .where('eventId', '==', eventId)
    .where('status', '==', 'ready')
    .orderBy(FieldPath.documentId())
    .limit(20);
  if (data.mine === true) query = query.where('ownerUid', '==', uid);
  if (data.after) query = query.startAfter(id(data.after));
  const result = await query.get();
  const items = [];
  for (const doc of result.docs) {
    const m = doc.data();
    if (!staff) {
      const ownerAccess = await accessRef(eventId, m.ownerUid).get();
      if (
        !ownerAccess.data()?.accepted ||
        ownerAccess.data()?.revision !== event.data.privacyRevision
      )
        continue;
    }
    items.push({ id: doc.id, eventId, contentType: m.contentType, uploadedAt: m.uploadedAt });
  }
  return { items, next: result.size === 20 ? result.docs.at(-1).id : null };
}

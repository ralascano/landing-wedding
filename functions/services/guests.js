import { FieldPath } from 'firebase-admin/firestore';
import { db, stamp, audit, guestUid, read } from './context.js';
import { need, id, text } from '../lib/validation.js';
import { publicEvent } from '../lib/policy.js';

export const accessRef = (eventId, uid) => db.doc(`guest_access/${eventId}_${uid}`);
export async function resolveEvent(request, data) {
  const uid = guestUid(request);
  const slug = text(data.slug, 'URL', 80);
  need(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), 'URL inválida.');
  const lookup = await read(null, 'event_slugs', slug);
  const event = await read(null, 'events', lookup.data.eventId);
  need(
    ['active', 'closed'].includes(event.data.status),
    'Este evento no está disponible.',
    'not-found',
  );
  const docs = await Promise.all(
    event.data.legalDocumentIds.map((docId) => read(null, 'legal_documents', docId)),
  );
  const access = await accessRef(event.data.id, uid).get();
  return {
    event: publicEvent(event.data),
    documents: docs.map((d) => d.data),
    accepted:
      access.data()?.accepted === true && access.data()?.revision === event.data.privacyRevision,
  };
}
export async function acceptConsent(request, data) {
  const uid = guestUid(request);
  const eventId = id(data.eventId);
  const requestId = id(data.requestId);
  need(
    data.accepted === true && Array.isArray(data.documentIds),
    'La aceptación debe ser explícita.',
  );
  return db.runTransaction(async (tx) => {
    const event = await read(tx, 'events', eventId);
    need(
      ['active', 'closed'].includes(event.data.status),
      'Evento no disponible.',
      'failed-precondition',
    );
    const required = [...event.data.legalDocumentIds].sort();
    const currentAccess = await tx.get(accessRef(eventId, uid));
    need(
      required.length > 0 &&
        data.revision === event.data.privacyRevision &&
        JSON.stringify([...data.documentIds].sort()) === JSON.stringify(required),
      'Los documentos han cambiado. Recarga y revisa la versión actual.',
      'failed-precondition',
    );
    if (
      currentAccess.data()?.accepted &&
      currentAccess.data()?.revision === event.data.privacyRevision
    ) {
      return { id: currentAccess.data().consentId };
    }
    const evidence = [];
    for (const docId of required) {
      const doc = await read(tx, 'legal_documents', docId);
      evidence.push({
        documentId: docId,
        version: doc.data.version,
        purpose: doc.data.purpose,
        sha256: doc.data.sha256,
      });
    }
    const receipt = db.doc(`consents/${eventId}_${uid}_${requestId}`);
    const old = await tx.get(receipt);
    if (old.exists) return { id: receipt.id };
    tx.create(receipt, {
      eventId,
      uid,
      kind: 'acceptance',
      revision: event.data.privacyRevision,
      evidence,
      explicit: true,
      channel: 'event-web',
      createdAt: stamp(),
    });
    tx.set(
      accessRef(eventId, uid),
      {
        eventId,
        uid,
        revision: event.data.privacyRevision,
        accepted: true,
        consentId: receipt.id,
        updatedAt: stamp(),
      },
      { merge: true },
    );
    audit(tx, uid, 'consent.accepted', eventId, { consentId: receipt.id });
    return { id: receipt.id };
  });
}
export async function withdrawConsent(request, data) {
  const uid = guestUid(request);
  const eventId = id(data.eventId);
  const requestId = id(data.requestId);
  return db.runTransaction(async (tx) => {
    const event = await read(tx, 'events', eventId);
    const access = await tx.get(accessRef(eventId, uid));
    need(access.exists, 'No hay consentimiento registrado.', 'failed-precondition');
    if (access.data().accepted === false && access.data().withdrawalId)
      return { id: access.data().withdrawalId };
    const receipt = db.doc(`consents/${eventId}_${uid}_${requestId}`);
    const previous = await tx.get(receipt);
    if (previous.exists) return { id: receipt.id };
    tx.create(receipt, {
      eventId,
      uid,
      kind: 'withdrawal',
      revision: access.data().revision,
      createdAt: stamp(),
    });
    tx.set(
      accessRef(eventId, uid),
      { accepted: false, withdrawalId: receipt.id, updatedAt: stamp() },
      { merge: true },
    );
    // Invalidate all outstanding upload tickets atomically; no file is deleted.
    tx.update(event.ref, { uploadEpoch: event.data.uploadEpoch + 1 });
    audit(tx, uid, 'consent.withdrawn', eventId, { consentId: receipt.id });
    return { id: receipt.id };
  });
}
export async function requestDeletion(request, data) {
  const uid = guestUid(request);
  const eventId = id(data.eventId);
  const requestId = id(data.requestId);
  const reason = text(data.reason, 'Solicitud', 2000, true);
  return db.runTransaction(async (tx) => {
    await read(tx, 'events', eventId);
    const access = await tx.get(accessRef(eventId, uid));
    need(access.exists, 'No hay actividad vinculada a esta sesión.', 'failed-precondition');
    if (access.data().deletionRequestId) return { id: access.data().deletionRequestId };
    const receipt = db.doc(`consents/${eventId}_${uid}_${requestId}`);
    const previous = await tx.get(receipt);
    if (previous.exists) return { id: receipt.id };
    tx.create(receipt, {
      eventId,
      uid,
      kind: 'deletion_request',
      status: 'pending',
      reason,
      createdAt: stamp(),
    });
    tx.set(accessRef(eventId, uid), { deletionRequestId: receipt.id }, { merge: true });
    audit(tx, uid, 'deletion.requested', eventId, { requestId: receipt.id });
    return { id: receipt.id };
  });
}
export async function myConsents(request, data) {
  const uid = guestUid(request);
  const eventId = id(data.eventId);
  let query = db
    .collection('consents')
    .where('eventId', '==', eventId)
    .where('uid', '==', uid)
    .orderBy(FieldPath.documentId())
    .limit(30);
  if (data.after) query = query.startAfter(id(data.after));
  const result = await query.get();
  return {
    items: result.docs.map((d) => ({ ...d.data(), id: d.id })),
    next: result.size === 30 ? result.docs.at(-1).id : null,
  };
}

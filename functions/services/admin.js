import { Timestamp, FieldPath } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import {
  db,
  auth,
  stamp,
  audit,
  actorFor,
  read,
  publicOrigin,
  premiumTemplates,
} from './context.js';
import { need, text, id, integer, choice, url } from '../lib/validation.js';
import { requireStaff, requireOwner, requireSuperadmin, requireTransition } from '../lib/policy.js';
import { validateConfig } from '../lib/config.js';

function version(record, expected) {
  need(
    record.version === expected,
    'Otro administrador cambió este registro. Recarga antes de guardar.',
    'aborted',
  );
}
export async function session(request) {
  const actor = await actorFor(request);
  requireStaff(actor);
  return { uid: actor.uid, role: actor.role, email: actor.email ?? '' };
}
export async function getRecord(request, data) {
  const actor = await actorFor(request);
  requireStaff(actor);
  const collection = choice(data.collection, ['customers', 'events', 'orders'], 'Colección');
  const record = await read(null, collection, id(data.id));
  requireOwner(actor, record.data);
  return record.data;
}
export async function listRecords(request, data) {
  const actor = await actorFor(request);
  requireStaff(actor);
  const name = choice(
    data.collection,
    [
      'customers',
      'events',
      'orders',
      'legal_documents',
      'consents',
      'users',
      'audit_logs',
      'media',
    ],
    'Colección',
  );
  let query = db.collection(name);
  if (['users', 'audit_logs'].includes(name)) requireSuperadmin(actor);
  if (['consents', 'media'].includes(name)) {
    const event = await read(null, 'events', id(data.eventId));
    requireOwner(actor, event.data);
    query = query.where('eventId', '==', event.data.id);
  } else if (['customers', 'events', 'orders'].includes(name) && actor.role !== 'superadmin') {
    query = query.where('ownerUid', '==', actor.uid);
  }
  query = query.orderBy(FieldPath.documentId()).limit(50);
  if (data.after) query = query.startAfter(id(data.after));
  const docs = await query.get();
  return {
    items: docs.docs.map((d) => ({ ...d.data(), id: d.id })),
    next: docs.size === 50 ? docs.docs.at(-1).id : null,
  };
}
export async function saveCustomer(request, data) {
  const customerId = id(data.id);
  const fields = {
    name: text(data.name, 'Nombre'),
    email: text(data.email, 'Email', 200, true),
    phone: text(data.phone, 'Teléfono', 40, true),
    notes: text(data.notes, 'Notas', 2000, true),
  };
  return db.runTransaction(async (tx) => {
    const actor = await actorFor(request, tx);
    requireStaff(actor);
    const ref = db.doc(`customers/${customerId}`);
    const snap = await tx.get(ref);
    if (snap.exists) {
      requireOwner(actor, snap.data());
      version(snap.data(), data.version);
    }
    const record = {
      ...fields,
      ownerUid: snap.exists ? snap.data().ownerUid : actor.uid,
      version: (snap.data()?.version ?? 0) + 1,
      updatedAt: stamp(),
    };
    if (!snap.exists) record.createdAt = stamp();
    tx.set(ref, record, { merge: true });
    audit(tx, actor.uid, snap.exists ? 'customer.updated' : 'customer.created', customerId);
    return { id: customerId };
  });
}
export async function saveEvent(request, data) {
  const eventId = id(data.id);
  const customerId = id(data.customerId);
  const plan = choice(data.plan, ['basic', 'premium'], 'Plan');
  const config = validateConfig(data.config, eventId, plan, premiumTemplates());
  need(typeof data.galleryEnabled === 'boolean', 'Galería inválida.');
  const maxPhotos = integer(data.maxPhotos ?? 1000, 1, 10000, 'Máximo fotos');
  const maxBytes = integer(data.maxBytes ?? 1073741824, 1048576, 10737418240, 'Máximo bytes');
  return db.runTransaction(async (tx) => {
    const actor = await actorFor(request, tx);
    requireStaff(actor);
    const ref = db.doc(`events/${eventId}`);
    const snap = await tx.get(ref);
    const customer = await read(tx, 'customers', customerId);
    requireOwner(actor, customer.data);
    let slug;
    if (snap.exists) {
      requireOwner(actor, snap.data());
      version(snap.data(), data.version);
      need(
        snap.data().status !== 'finished',
        'Evento finalizado: configuración bloqueada.',
        'failed-precondition',
      );
      need(
        customer.data.ownerUid === snap.data().ownerUid,
        'El cliente debe pertenecer al mismo responsable.',
      );
      slug = snap.data().slug;
      need(data.slug === slug, 'La URL del evento es permanente.');
      need(
        maxPhotos >= snap.data().reservedPhotos && maxBytes >= snap.data().reservedBytes,
        'La cuota no puede ser menor que las reservas existentes.',
      );
    } else {
      slug = text(data.slug, 'Slug', 80);
      need(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
        'Slug: usa letras minúsculas, números y guiones.',
      );
      const slugSnap = await tx.get(db.doc(`event_slugs/${slug}`));
      need(!slugSnap.exists, 'URL ya utilizada.', 'already-exists');
    }
    const record = {
      config,
      customerId,
      plan,
      slug,
      galleryEnabled: data.galleryEnabled,
      maxPhotos,
      maxBytes,
      ownerUid: snap.exists ? snap.data().ownerUid : customer.data.ownerUid,
      version: (snap.data()?.version ?? 0) + 1,
      updatedAt: stamp(),
    };
    if (!snap.exists) {
      Object.assign(record, {
        status: 'draft',
        legalDocumentIds: [],
        privacyRevision: 1,
        uploadEpoch: 1,
        reservedPhotos: 0,
        reservedBytes: 0,
        createdAt: stamp(),
      });
      tx.create(db.doc(`event_slugs/${slug}`), { eventId, createdAt: stamp() });
    }
    tx.set(ref, record, { merge: true });
    audit(tx, actor.uid, snap.exists ? 'event.updated' : 'event.created', eventId);
    return { id: eventId, slug };
  });
}
export async function changeState(request, data) {
  return db.runTransaction(async (tx) => {
    const actor = await actorFor(request, tx);
    const event = await read(tx, 'events', id(data.eventId));
    requireOwner(actor, event.data);
    version(event.data, data.version);
    requireTransition(event.data.status, data.status);
    if (data.status === 'active') {
      need(
        event.data.legalDocumentIds.length > 0,
        'Asocia documentos legales revisados antes de activar.',
        'failed-precondition',
      );
      for (const docId of event.data.legalDocumentIds) await read(tx, 'legal_documents', docId);
      publicOrigin();
    }
    tx.update(event.ref, {
      status: data.status,
      uploadEpoch: event.data.uploadEpoch + 1,
      version: event.data.version + 1,
      updatedAt: stamp(),
    });
    audit(tx, actor.uid, 'event.state', event.data.id, {
      from: event.data.status,
      to: data.status,
    });
    return { status: data.status };
  });
}
export async function publishLegal(request, data) {
  const docId = id(data.id);
  const fields = {
    title: text(data.title, 'Título', 200),
    version: text(data.version, 'Versión', 60),
    purpose: text(data.purpose, 'Finalidad', 500),
    body: text(data.body, 'Documento legal', 30000),
  };
  need(
    data.reviewed === true,
    'Confirma que el documento fue revisado; no hay textos legales predeterminados.',
  );
  const sha256 = createHash('sha256').update(JSON.stringify(fields)).digest('hex');
  return db.runTransaction(async (tx) => {
    const actor = await actorFor(request, tx);
    requireSuperadmin(actor);
    const ref = db.doc(`legal_documents/${docId}`);
    const old = await tx.get(ref);
    need(!old.exists, 'Las versiones legales son inmutables. Crea otro ID.', 'already-exists');
    tx.create(ref, { ...fields, sha256, reviewedBy: actor.uid, createdAt: stamp() });
    audit(tx, actor.uid, 'legal.published', docId, { sha256 });
    return { id: docId };
  });
}
export async function setPrivacy(request, data) {
  need(
    Array.isArray(data.documentIds) && data.documentIds.length > 0 && data.documentIds.length <= 5,
    'Selecciona entre 1 y 5 documentos.',
  );
  const documentIds = [...new Set(data.documentIds.map(id))];
  return db.runTransaction(async (tx) => {
    const actor = await actorFor(request, tx);
    const event = await read(tx, 'events', id(data.eventId));
    requireOwner(actor, event.data);
    version(event.data, data.version);
    need(
      ['draft', 'closed'].includes(event.data.status),
      'Cierra el evento antes de cambiar requisitos legales.',
      'failed-precondition',
    );
    for (const docId of documentIds) await read(tx, 'legal_documents', docId);
    tx.update(event.ref, {
      legalDocumentIds: documentIds,
      privacyRevision: event.data.privacyRevision + 1,
      uploadEpoch: event.data.uploadEpoch + 1,
      version: event.data.version + 1,
      updatedAt: stamp(),
    });
    audit(tx, actor.uid, 'event.privacy', event.data.id, { documentIds });
    return { ok: true };
  });
}
export async function createOrder(request, data) {
  const orderId = id(data.id);
  return db.runTransaction(async (tx) => {
    const actor = await actorFor(request, tx);
    const event = await read(tx, 'events', id(data.eventId));
    requireOwner(actor, event.data);
    const ref = db.doc(`orders/${orderId}`);
    const previous = await tx.get(ref);
    if (previous.exists) {
      requireOwner(actor, previous.data());
      need(previous.data().eventId === event.data.id, 'ID reutilizado.');
      return { id: orderId };
    }
    const totalCents =
      event.data.plan === 'basic'
        ? 3999
        : integer(data.totalCents, 1, 100000000, 'Cotización en centavos');
    tx.create(ref, {
      eventId: event.data.id,
      customerId: event.data.customerId,
      ownerUid: event.data.ownerUid,
      plan: event.data.plan,
      currency: 'USD',
      totalCents,
      paidCents: 0,
      payments: [],
      status: 'pending',
      createdAt: stamp(),
      updatedAt: stamp(),
    });
    audit(tx, actor.uid, 'order.created', orderId);
    return { id: orderId };
  });
}
export async function recordPayment(request, data) {
  const key = id(data.paymentId);
  const amountCents = integer(data.amountCents, 1, 100000000, 'Importe');
  const method = choice(data.method, ['cash', 'transfer', 'other'], 'Método');
  const reference = text(data.reference, 'Referencia', 200, true);
  return db.runTransaction(async (tx) => {
    const actor = await actorFor(request, tx);
    const order = await read(tx, 'orders', id(data.orderId));
    requireOwner(actor, order.data);
    const existing = order.data.payments.find((p) => p.id === key);
    if (existing) {
      need(
        existing.amountCents === amountCents &&
          existing.method === method &&
          existing.reference === reference,
        'La clave de pago ya se usó con otros datos.',
      );
      return { ok: true };
    }
    const total = order.data.paidCents + amountCents;
    need(
      total <= order.data.totalCents && order.data.payments.length < 100,
      'Pago excede el saldo o límite de registros.',
    );
    tx.update(order.ref, {
      paidCents: total,
      status: total === order.data.totalCents ? 'paid' : 'partial',
      payments: [
        ...order.data.payments,
        {
          id: key,
          amountCents,
          method,
          reference,
          recordedBy: actor.uid,
          recordedAt: Timestamp.now(),
        },
      ],
      updatedAt: stamp(),
    });
    audit(tx, actor.uid, 'payment.recorded', order.data.id, { paymentId: key, amountCents });
    return { ok: true };
  });
}
export async function assignRole(request, data) {
  const targetUid = id(data.uid);
  const role = choice(data.role, ['superadmin', 'seller', 'customer'], 'Rol');
  need(typeof data.enabled === 'boolean', 'Estado de cuenta inválido.');
  const initialActor = await actorFor(request);
  requireSuperadmin(initialActor);
  const authUser = await auth.getUser(targetUid);
  need(
    authUser.providerData.some((p) => p.providerId === 'password'),
    'Crea primero la cuenta Email/Password en Firebase Auth.',
  );
  return db.runTransaction(async (tx) => {
    const actor = await actorFor(request, tx);
    requireSuperadmin(actor);
    const target = db.doc(`users/${targetUid}`);
    const previous = await tx.get(target);
    const counter = db.doc('system/roles');
    const counterSnap = await tx.get(counter);
    const wasSuper = previous.data()?.role === 'superadmin' && previous.data()?.enabled === true;
    const isSuper = role === 'superadmin' && data.enabled;
    const count = (counterSnap.data()?.superadmins ?? 0) + Number(isSuper) - Number(wasSuper);
    need(count >= 1, 'Debe quedar al menos un superadmin activo.', 'failed-precondition');
    tx.set(counter, { superadmins: count });
    tx.set(
      target,
      {
        role,
        enabled: data.enabled,
        email: authUser.email ?? '',
        updatedAt: stamp(),
        ...(previous.exists ? {} : { createdAt: stamp() }),
      },
      { merge: true },
    );
    audit(tx, actor.uid, 'role.assigned', targetUid, { role, enabled: data.enabled });
    return { ok: true };
  });
}
export async function saveQr(request, data) {
  const settings = {
    color: text(data.color, 'Color', 7),
    background: text(data.background, 'Fondo', 7),
    dots: choice(data.dots, ['square', 'dots', 'rounded', 'classy'], 'Estilo'),
    logo: url(data.logo || null, { nullable: true }),
  };
  need(
    /^#[0-9a-f]{6}$/i.test(settings.color) && /^#[0-9a-f]{6}$/i.test(settings.background),
    'Colores QR inválidos.',
  );
  return db.runTransaction(async (tx) => {
    const actor = await actorFor(request, tx);
    const event = await read(tx, 'events', id(data.eventId));
    requireOwner(actor, event.data);
    const ref = db.doc(`qr_codes/${event.data.id}`);
    const previous = await tx.get(ref);
    // Freeze the canonical URL on first save. Config/template changes never change it.
    const targetUrl = previous.data()?.targetUrl ?? `${publicOrigin()}/e/${event.data.slug}`;
    tx.set(ref, {
      eventId: event.data.id,
      ownerUid: event.data.ownerUid,
      targetUrl,
      settings,
      updatedAt: stamp(),
      ...(previous.exists ? {} : { createdAt: stamp() }),
    });
    audit(tx, actor.uid, 'qr.saved', event.data.id);
    return { targetUrl, settings };
  });
}
export async function getQr(request, data) {
  const actor = await actorFor(request);
  const event = await read(null, 'events', id(data.eventId));
  requireOwner(actor, event.data);
  const qr = await db.doc(`qr_codes/${event.data.id}`).get();
  return qr.exists
    ? qr.data()
    : {
        targetUrl: `${publicOrigin()}/e/${event.data.slug}`,
        settings: { color: '#542d91', background: '#ffffff', dots: 'rounded', logo: null },
      };
}

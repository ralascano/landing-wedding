import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
const project = 'demo-recuerdosqr';
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !process.env.FIREBASE_STORAGE_EMULATOR_HOST
)
  throw new Error('Execute only with Firebase emulators: npm run test:integration');
initializeApp({ projectId: project, storageBucket: `${project}.appspot.com` });
const db = getFirestore();
const config = JSON.parse(
  readFileSync(new URL('../../src/config/event-config.json', import.meta.url), 'utf8'),
);
async function account(email) {
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        email
          ? { email, password: 'Local-test-password-42!', returnSecureToken: true }
          : { returnSecureToken: true },
      ),
    },
  );
  const result = await response.json();
  assert.ok(result.idToken, JSON.stringify(result));
  return { uid: result.localId, token: result.idToken };
}
async function call(user, action, payload = {}) {
  const response = await fetch(`http://127.0.0.1:5001/${project}/us-central1/api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(user ? { Authorization: `Bearer ${user.token}` } : {}),
    },
    body: JSON.stringify({ data: { action, payload } }),
  });
  const body = await response.json();
  if (body.error) throw Object.assign(new Error(body.error.message), { code: body.error.status });
  return body.result;
}
test('real callable integration: roles, isolation, immutable legal evidence, quotas, uploads and state changes', async () => {
  const suffix = Date.now();
  const admin = await account(`admin-${suffix}@example.test`);
  const seller = await account(`seller-${suffix}@example.test`);
  const other = await account(`other-${suffix}@example.test`);
  const guest = await account();
  const guest2 = await account();
  await db
    .doc(`users/${admin.uid}`)
    .set({ role: 'superadmin', enabled: true, createdAt: FieldValue.serverTimestamp() });
  await db.doc('system/roles').set({ superadmins: 1 });
  await assert.rejects(call(guest, 'session'));
  await assert.rejects(call(null, 'session'));
  await call(admin, 'assignRole', { uid: seller.uid, role: 'seller', enabled: true });
  await call(admin, 'assignRole', { uid: other.uid, role: 'seller', enabled: true });
  await assert.rejects(
    call(seller, 'assignRole', { uid: seller.uid, role: 'superadmin', enabled: true }),
  );
  await assert.rejects(
    call(admin, 'assignRole', { uid: admin.uid, role: 'seller', enabled: true }),
  );
  const customerId = `customer-${suffix}`,
    eventId = `event-${suffix}`,
    docId = `legal-${suffix}`;
  await call(seller, 'saveCustomer', {
    id: customerId,
    name: 'Cliente prueba',
    email: '',
    phone: '',
    notes: '',
  });
  await call(seller, 'saveEvent', {
    id: eventId,
    customerId,
    slug: `test-${suffix}`,
    plan: 'basic',
    config,
    galleryEnabled: true,
    maxPhotos: 2,
    maxBytes: 1048576,
  });
  await assert.rejects(call(other, 'changeState', { eventId, version: 1, status: 'active' }));
  await assert.rejects(call(guest, 'resolveEvent', { slug: `test-${suffix}` }));
  await assert.rejects(call(seller, 'changeState', { eventId, version: 1, status: 'active' }));
  await call(admin, 'publishLegal', {
    id: docId,
    title: 'Documento de TEST, no legal',
    version: 'test-1',
    purpose: 'Solo prueba de software',
    body: 'Contenido de prueba técnica sin validez legal.',
    reviewed: true,
  });
  await assert.rejects(
    call(admin, 'publishLegal', {
      id: docId,
      title: 'Cambio',
      version: 'test-1',
      purpose: 'Test',
      body: 'Cambio',
      reviewed: true,
    }),
  );
  await call(seller, 'setPrivacy', { eventId, version: 1, documentIds: [docId] });
  await call(seller, 'changeState', { eventId, version: 2, status: 'active' });
  const publicData = await call(guest, 'resolveEvent', { slug: `test-${suffix}` });
  assert.equal(publicData.event.customerId, undefined);
  assert.equal(publicData.event.config.event.id, eventId);
  const photo = readFileSync(new URL('../../src/assets/background.jpg', import.meta.url));
  const payload = {
    eventId,
    requestId: `batch-${suffix}`,
    name: 'Invitado',
    files: [{ name: 'photo.jpg', type: 'image/jpeg', size: photo.length }],
  };
  await assert.rejects(call(guest, 'authorizeUpload', payload));
  await assert.rejects(
    call(guest, 'acceptConsent', {
      eventId,
      requestId: 'bad',
      accepted: false,
      revision: 2,
      documentIds: [docId],
    }),
  );
  for (const g of [guest, guest2])
    await call(g, 'acceptConsent', {
      eventId,
      requestId: 'consent',
      accepted: true,
      revision: 2,
      documentIds: [docId],
    });
  const { tickets } = await call(guest, 'authorizeUpload', payload);
  assert.equal(tickets.length, 1);
  const retry = await call(guest, 'authorizeUpload', payload);
  assert.equal(retry.tickets[0].id, tickets[0].id);
  await assert.rejects(
    call(guest2, 'uploadPhoto', { mediaId: tickets[0].id, base64: photo.toString('base64') }),
  );
  await call(guest, 'uploadPhoto', { mediaId: tickets[0].id, base64: photo.toString('base64') });
  const stored = await db.doc(`media/${tickets[0].id}`).get();
  assert.equal(stored.data().status, 'ready');
  assert.ok(stored.data().path.startsWith(`events/${eventId}/${guest.uid}/`));
  const gallery = await call(guest2, 'listMedia', { eventId });
  assert.equal(gallery.items.length, 1);
  const download = await fetch(
    `http://127.0.0.1:5001/${project}/us-central1/mediaDownload?id=${tickets[0].id}`,
    { headers: { Authorization: `Bearer ${guest2.token}` } },
  );
  assert.equal(download.status, 200);
  const stranger = await account();
  await assert.rejects(call(stranger, 'listMedia', { eventId }));
  await assert.rejects(call(other, 'getRecord', { collection: 'events', id: eventId }));
  const directStorage = await fetch(
    `http://127.0.0.1:9199/v0/b/${project}.appspot.com/o/${encodeURIComponent(stored.data().path)}?alt=media`,
    { headers: { Authorization: `Bearer ${guest.token}` } },
  );
  assert.equal(directStorage.status, 403);
  await call(guest, 'withdrawConsent', { eventId, requestId: 'withdraw' });
  const hidden = await call(guest2, 'listMedia', { eventId });
  assert.equal(hidden.items.length, 0);
  const denied = await fetch(
    `http://127.0.0.1:5001/${project}/us-central1/mediaDownload?id=${tickets[0].id}`,
    { headers: { Authorization: `Bearer ${guest2.token}` } },
  );
  assert.equal(denied.status, 403);
  await call(guest, 'requestDeletion', { eventId, requestId: 'delete' });
  assert.equal((await db.doc(`media/${tickets[0].id}`).get()).exists, true);
  const qr = await call(seller, 'saveQr', {
    eventId,
    color: '#542d91',
    background: '#ffffff',
    dots: 'rounded',
    logo: null,
  });
  assert.ok(qr.targetUrl.endsWith(`/e/test-${suffix}`));
  await call(seller, 'createOrder', { id: `order-${suffix}`, eventId, totalCents: 1 });
  await call(seller, 'recordPayment', {
    orderId: `order-${suffix}`,
    paymentId: 'pay1',
    amountCents: 3999,
    method: 'cash',
    reference: '',
  });
  await call(seller, 'recordPayment', {
    orderId: `order-${suffix}`,
    paymentId: 'pay1',
    amountCents: 3999,
    method: 'cash',
    reference: '',
  });
  assert.equal((await db.doc(`orders/order-${suffix}`).get()).data().paidCents, 3999);
  await call(seller, 'changeState', { eventId, version: 3, status: 'closed' });
  await assert.rejects(call(guest2, 'authorizeUpload', { ...payload, requestId: 'after-close' }));
  const direct = await fetch(
    `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents/events/${eventId}`,
    { headers: { Authorization: `Bearer ${guest.token}` } },
  );
  assert.equal(direct.status, 403);
  const directWrite = await fetch(
    `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents/users/${guest.uid}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${guest.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { role: { stringValue: 'superadmin' } } }),
    },
  );
  assert.equal(directWrite.status, 403);
});

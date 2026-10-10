import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';
import { need } from '../lib/validation.js';

initializeApp();
export const db = getFirestore();
export const auth = getAuth();
export const bucket = () => getStorage().bucket();
export const stamp = () => FieldValue.serverTimestamp();
export const uid = () => randomUUID();
export const future = (ms) => Timestamp.fromMillis(Date.now() + ms);
export function audit(tx, actorUid, action, targetId, details = {}) {
  tx.create(db.collection('audit_logs').doc(), {
    actorUid,
    action,
    targetId,
    details,
    createdAt: stamp(),
  });
}
export async function actorFor(request, tx = null) {
  need(request.auth?.uid, 'Inicia sesión.', 'unauthenticated');
  const ref = db.doc(`users/${request.auth.uid}`);
  const snap = tx ? await tx.get(ref) : await ref.get();
  return {
    ...snap.data(),
    uid: request.auth.uid,
    provider: request.auth.token.firebase?.sign_in_provider,
  };
}
export function guestUid(request) {
  need(request.auth?.uid, 'Identificación anónima requerida.', 'unauthenticated');
  return request.auth.uid;
}
export async function read(tx, collection, id) {
  const ref = db.collection(collection).doc(id);
  const snap = tx ? await tx.get(ref) : await ref.get();
  need(snap.exists, 'Recurso no encontrado.', 'not-found');
  return { ref, data: { ...snap.data(), id: snap.id } };
}
export function publicOrigin() {
  const origin =
    process.env.PUBLIC_ORIGIN ||
    (process.env.FUNCTIONS_EMULATOR === 'true' ? 'http://localhost:5173' : '');
  need(
    /^https:\/\/[^/]+$/.test(origin) ||
      (process.env.FUNCTIONS_EMULATOR === 'true' &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)),
    'Configura PUBLIC_ORIGIN en el backend.',
    'failed-precondition',
  );
  return origin;
}
export function premiumTemplates() {
  return JSON.parse(process.env.PREMIUM_TEMPLATES || '{}');
}
export function wire(value) {
  if (value?.toDate) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(wire);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, wire(v)]));
  return value;
}

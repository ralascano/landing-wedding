// Local demo only. Never accepts a real project or a remote emulator address.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
initializeApp({ projectId: 'demo-recuerdosqr' });
const auth = getAuth();
const db = getFirestore();
const email = 'admin@example.test';
let user;
try {
  user = await auth.getUserByEmail(email);
} catch (error) {
  if (error.code !== 'auth/user-not-found') throw error;
  user = await auth.createUser({ email, password: 'Local-test-password-42!' });
}
await db.runTransaction(async (tx) => {
  const counter = db.doc('system/roles');
  const existing = await tx.get(counter);
  if (existing.exists) return;
  tx.create(counter, { superadmins: 1 });
  tx.create(db.doc(`users/${user.uid}`), {
    role: 'superadmin',
    enabled: true,
    email,
    createdAt: FieldValue.serverTimestamp(),
  });
});
console.log('Emulador local: admin@example.test / Local-test-password-42!');

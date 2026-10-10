import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [projectId, email] = process.argv.slice(2);
if (!projectId || !email)
  throw new Error('Uso: npm run bootstrap -- PROJECT_ID EMAIL (cuenta Auth existente)');
if (
  projectId.startsWith('demo-') &&
  (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST)
)
  throw new Error('Faltan los hosts de emuladores.');
if (!projectId.startsWith('demo-') && process.env.CONFIRM_BOOTSTRAP_PROJECT !== projectId)
  throw new Error(
    'Para un proyecto real, define CONFIRM_BOOTSTRAP_PROJECT igual al ID y credenciales ADC de un operador autorizado.',
  );
initializeApp({ projectId });
const db = getFirestore();
const user = await getAuth().getUserByEmail(email);
if (!user.providerData.some((p) => p.providerId === 'password'))
  throw new Error('Se requiere una cuenta Email/Password.');
await db.runTransaction(async (tx) => {
  const counter = db.doc('system/roles');
  const existing = await tx.get(counter);
  if (existing.exists) throw new Error('Bootstrap ya realizado. Usa la administración de roles.');
  tx.create(counter, { superadmins: 1 });
  tx.create(db.doc(`users/${user.uid}`), {
    role: 'superadmin',
    enabled: true,
    email: user.email,
    createdAt: FieldValue.serverTimestamp(),
  });
  tx.create(db.collection('audit_logs').doc(), {
    actorUid: 'operator-bootstrap',
    action: 'role.bootstrap',
    targetId: user.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
});
console.log('Superadmin inicial registrado:', user.uid);

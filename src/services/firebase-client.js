import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check';

let client;
export function getClient() {
  if (client) return client;
  const emulated = import.meta.env.VITE_USE_EMULATORS === 'true';
  const projectId = import.meta.env.VITE_PROJECTID || (emulated ? 'demo-recuerdosqr' : '');
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || (emulated ? 'demo-api-key' : '');
  if (!projectId || !apiKey)
    throw new Error(
      'Configura las variables Firebase o activa los emuladores. Consulta docs/SAAS.md.',
    );
  if (emulated && !projectId.startsWith('demo-'))
    throw new Error('Usa un proyecto demo-* para los emuladores.');
  const app = initializeApp(
    {
      projectId,
      apiKey,
      authDomain: import.meta.env.VITE_AUTHDOMAIN || `${projectId}.firebaseapp.com`,
      appId: import.meta.env.VITE_APPID || (emulated ? 'demo-app-id' : undefined),
      storageBucket: import.meta.env.VITE_STORAGEBUCKET || `${projectId}.appspot.com`,
    },
    'recuerdosqr-saas',
  );
  const auth = getAuth(app);
  const functions = getFunctions(app, 'us-central1');
  let appCheck;
  if (emulated) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  } else if (import.meta.env.VITE_APPCHECK_SITE_KEY) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_APPCHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }
  client = { app, auth, functions, appCheck, emulated, projectId };
  return client;
}
export async function ensureGuest() {
  const { auth } = getClient();
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser;
}
export async function api(action, payload = {}) {
  const { functions, appCheck, emulated } = getClient();
  if (!emulated && !appCheck) throw new Error('Falta configurar App Check para este dominio.');
  const result = await httpsCallable(functions, 'api', { timeout: 60000 })({ action, payload });
  return result.data;
}
export async function downloadPhoto(id, signal) {
  const { auth, appCheck, emulated, projectId } = getClient();
  const token = await auth.currentUser.getIdToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (appCheck) headers['X-Firebase-AppCheck'] = (await getToken(appCheck)).token;
  const base = emulated
    ? `http://127.0.0.1:5001/${projectId}/us-central1`
    : `https://us-central1-${projectId}.cloudfunctions.net`;
  const response = await fetch(`${base}/mediaDownload?id=${encodeURIComponent(id)}`, {
    headers,
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Foto no disponible.');
  return response.blob();
}
export async function uploadEventPhotos(eventId, files, name) {
  await ensureGuest();
  const { tickets } = await api('authorizeUpload', {
    eventId,
    requestId: crypto.randomUUID(),
    name,
    files: files.map(({ file }) => ({ name: file.name, size: file.size, type: file.type })),
  });
  // Preserve the existing sequential upload flow after parallel browser compression.
  for (let i = 0; i < files.length; i++) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(files[i].file);
    });
    await api('uploadPhoto', { mediaId: tickets[i].id, base64 });
  }
}

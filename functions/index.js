import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getAppCheck } from 'firebase-admin/app-check';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from './services/admin.js';
import * as guests from './services/guests.js';
import * as media from './services/media.js';
import { auth, bucket, read, wire, publicOrigin } from './services/context.js';
import { DomainError, need, id } from './lib/validation.js';

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 3,
  memory: '256MiB',
  concurrency: 8,
  timeoutSeconds: 60,
});
const actions = {
  session: admin.session,
  getRecord: admin.getRecord,
  listRecords: admin.listRecords,
  saveCustomer: admin.saveCustomer,
  saveEvent: admin.saveEvent,
  changeState: admin.changeState,
  publishLegal: admin.publishLegal,
  setPrivacy: admin.setPrivacy,
  createOrder: admin.createOrder,
  recordPayment: admin.recordPayment,
  assignRole: admin.assignRole,
  saveQr: admin.saveQr,
  getQr: admin.getQr,
  resolveEvent: guests.resolveEvent,
  acceptConsent: guests.acceptConsent,
  withdrawConsent: guests.withdrawConsent,
  requestDeletion: guests.requestDeletion,
  myConsents: guests.myConsents,
  authorizeUpload: media.authorizeUpload,
  uploadPhoto: media.uploadPhoto,
  listMedia: media.listMedia,
};
export const api = onCall(
  { enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' },
  async (request) => {
    try {
      need(request.data && Object.hasOwn(actions, request.data.action), 'Operación desconocida.');
      return wire(await actions[request.data.action](request, request.data.payload ?? {}));
    } catch (error) {
      if (error instanceof DomainError) throw new HttpsError(error.code, error.message);
      console.error('api failure', { action: request.data?.action, code: error.code ?? 'unknown' });
      throw new HttpsError('internal', 'No se pudo completar la operación.');
    }
  },
);

export const mediaDownload = onRequest(async (req, res) => {
  try {
    const origin = publicOrigin();
    if (req.headers.origin === origin) res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Headers', 'Authorization, X-Firebase-AppCheck');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Cache-Control', 'private, no-store');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    need(req.method === 'GET', 'Método no permitido.');
    if (process.env.FUNCTIONS_EMULATOR !== 'true') {
      await getAppCheck().verifyToken(req.get('X-Firebase-AppCheck') || '');
    }
    const bearer = req.get('Authorization') || '';
    need(bearer.startsWith('Bearer '), 'Inicia sesión.', 'unauthenticated');
    const token = await auth.verifyIdToken(bearer.slice(7), true);
    const item = await read(null, 'media', id(req.query.id));
    await media.canReadMedia({ auth: { uid: token.uid, token } }, item.data);
    need(item.data.status === 'ready', 'Foto no disponible.', 'not-found');
    res.set('Content-Type', item.data.contentType);
    res.set('X-Content-Type-Options', 'nosniff');
    bucket()
      .file(item.data.path)
      .createReadStream()
      .on('error', () => {
        if (!res.headersSent) res.status(404).end();
        else res.destroy();
      })
      .pipe(res);
  } catch (error) {
    res
      .status(error.code === 'not-found' ? 404 : 403)
      .json({ error: 'Foto no disponible o acceso no autorizado.' });
  }
});

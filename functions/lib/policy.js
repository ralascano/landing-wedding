import { need } from './validation.js';
export const STATES = ['draft', 'active', 'closed', 'finished'];
const transitions = {
  draft: ['active'],
  active: ['closed'],
  closed: ['active', 'finished'],
  finished: [],
};
export function requireStaff(actor) {
  need(
    actor &&
      actor.uid &&
      actor.enabled === true &&
      ['seller', 'superadmin'].includes(actor.role) &&
      actor.provider !== 'anonymous',
    'Acceso administrativo requerido.',
    'permission-denied',
  );
}
export function requireSuperadmin(actor) {
  requireStaff(actor);
  need(actor.role === 'superadmin', 'Solo superadmin.', 'permission-denied');
}
export function requireOwner(actor, record) {
  requireStaff(actor);
  need(
    actor.role === 'superadmin' || record.ownerUid === actor.uid,
    'Recurso no autorizado.',
    'permission-denied',
  );
}
export function requireTransition(from, to) {
  need(
    transitions[from]?.includes(to),
    `Transición no permitida: ${from} → ${to}.`,
    'failed-precondition',
  );
}
export function requireConsent(event, access) {
  need(
    event.legalDocumentIds.length > 0 &&
      access?.accepted === true &&
      access.revision === event.privacyRevision,
    'Debes aceptar la versión vigente de los documentos antes de continuar.',
    'failed-precondition',
  );
}
export function requireUpload(event, access) {
  need(event.status === 'active', 'El evento no admite nuevas fotos.', 'failed-precondition');
  requireConsent(event, access);
}
export function publicEvent(event) {
  return {
    id: event.id,
    slug: event.slug,
    status: event.status,
    config: event.config,
    privacyRevision: event.privacyRevision,
    legalDocumentIds: event.legalDocumentIds,
    galleryEnabled: event.galleryEnabled,
  };
}

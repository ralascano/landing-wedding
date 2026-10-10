import { need, text, integer, choice, url } from './validation.js';

// The persisted contract remains data-only. React never controls authorization settings.
export function validateConfig(input, eventId, plan, premiumTemplates = {}) {
  need(input && typeof input === 'object' && !Array.isArray(input), 'Configuración requerida.');
  const json = JSON.stringify(input);
  need(json.length <= 64000, 'Configuración demasiado grande.');
  const c = JSON.parse(json);
  need(c.schemaVersion === 1, 'Versión de configuración no soportada.');
  if (c.template !== 'photo-hero') {
    need(
      plan === 'premium' && premiumTemplates[eventId] === c.template,
      'Plantilla premium no registrada para este evento.',
    );
  }
  need(
    c.event &&
      Array.isArray(c.event.names) &&
      c.event.names.length >= 1 &&
      c.event.names.length <= 8,
    'Nombres inválidos.',
  );
  c.event.id = eventId;
  c.event.title = text(c.event.title, 'Título', 160);
  c.event.type = text(c.event.type, 'Tipo', 50);
  c.event.names = c.event.names.map((n) => text(n, 'Nombre', 100));
  need(
    c.event.date === null ||
      (typeof c.event.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(c.event.date) &&
        !Number.isNaN(Date.parse(c.event.date))),
    'Fecha inválida.',
  );
  if (c.event.dateLabel) text(c.event.dateLabel, 'Fecha visible', 160);
  text(c.event.locale, 'Idioma', 20);
  need(
    c.images &&
      c.metadata &&
      c.templateOptions &&
      c.theme?.variables &&
      c.sections &&
      c.texts &&
      c.upload &&
      c.feedback &&
      c.gallery &&
      c.qr,
    'Faltan bloques del contrato.',
  );
  c.images.backgroundDesktop = url(c.images.backgroundDesktop ?? c.images.background?.desktop, {
    image: true,
  });
  c.images.backgroundMobile = url(
    c.images.backgroundMobile ?? c.images.background?.mobile ?? null,
    { image: true, nullable: true },
  );
  if (c.images.background) {
    choice(c.images.background.size, ['cover', 'contain'], 'Ajuste de imagen');
    for (const k of ['desktopPosition', 'mobilePosition']) {
      choice(
        c.images.background[k],
        ['center center', 'center top', 'center bottom', 'left center', 'right center'],
        'Encuadre',
      );
    }
  }
  c.metadata.title = text(c.metadata.title, 'Título de pestaña', 160);
  c.metadata.favicon = url(c.metadata.favicon);
  choice(
    c.templateOptions.identityPosition,
    ['top-left', 'top-center', 'top-right'],
    'Posición identidad',
  );
  choice(
    c.templateOptions.formPosition,
    ['bottom-left', 'bottom-center', 'bottom-right'],
    'Posición formulario',
  );
  need(Object.keys(c.theme.variables).length <= 80, 'Demasiadas variables.');
  for (const [key, value] of Object.entries(c.theme.variables)) {
    need(
      /^--event-[a-z-]+$/.test(key) &&
        typeof value === 'string' &&
        value.length < 300 &&
        !/[;{}<>]|url\s*\(|expression|@import/i.test(value),
      'Variable de tema inválida.',
    );
  }
  for (const key of ['identity', 'upload', 'instructions', 'photoPreview', 'decoration'])
    need(typeof c.sections[key] === 'boolean', `Sección ${key} inválida.`);
  const requiredTexts = {
    upload: [
      'title',
      'subtitle',
      'nameLabel',
      'namePlaceholder',
      'activeNamePlaceholder',
      'select',
      'submit',
      'submitting',
      'loading',
      'decoration',
    ],
    preview: [
      'open',
      'title',
      'instructionBefore',
      'removeSymbol',
      'instructionAfter',
      'imageAlt',
      'removeLabel',
      'removeButton',
      'confirm',
      'cancel',
      'close',
    ],
    messages: [
      'tooManyFiles',
      'uploadError',
      'uploadWait',
      'invalidName',
      'success',
      'selectWait',
      'close',
    ],
  };
  for (const [group, keys] of Object.entries(requiredTexts)) {
    for (const key of keys)
      need(
        typeof c.texts[group]?.[key] === 'string' && c.texts[group][key].length <= 1000,
        `Texto ${group}.${key} inválido.`,
      );
  }
  integer(c.upload.maxFiles, 1, 50, 'Límite de fotos');
  integer(c.upload.cooldownMs, 0, 3600000, 'Espera');
  need(
    typeof c.upload.multiple === 'boolean' && c.upload.accept === 'image/*',
    'Selector inválido.',
  );
  need(
    c.upload.compression?.maxSizeMB > 0 && c.upload.compression.maxSizeMB <= 2,
    'Compresión: máximo 2 MB.',
  );
  integer(c.upload.compression.maxWidthOrHeight, 256, 4096, 'Dimensión');
  integer(c.feedback.alertDurationMs, 1000, 60000, 'Duración alerta');
  integer(c.gallery.thumbnailSize, 80, 240, 'Miniatura');
  need(/^\d{1,2}vh$/.test(c.gallery.modalMaxHeight), 'Altura modal inválida.');
  // Remote gallery access is controlled by event.galleryEnabled, not the JSON.
  c.gallery.mode = 'local-preview';
  c.gallery.remoteEnabled = false;
  c.qr.mode = 'external';
  c.qr.targetUrl = null;
  c.qr.imageSrc = url(c.qr.imageSrc ?? null, { nullable: true, image: true });
  return c;
}

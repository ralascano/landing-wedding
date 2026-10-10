// Boundary checks only; guest validation and upload behavior are unchanged.
export function validateEventConfig(config) {
  const fail = (message) => {
    throw new Error(`Invalid event config: ${message}`);
  };
  if (config.schemaVersion !== 1) fail('unsupported schemaVersion');
  if ((config.template ?? 'photo-hero') !== 'photo-hero') fail('unsupported template');
  const positions = config.templateOptions;
  if (
    !['top-left', 'top-center', 'top-right'].includes(positions?.identityPosition ?? 'top-center')
  ) {
    fail('unsupported identityPosition');
  }
  if (
    !['bottom-left', 'bottom-center', 'bottom-right'].includes(
      positions?.formPosition ?? 'bottom-center',
    )
  ) {
    fail('unsupported formPosition');
  }
  const desktop = config.images?.backgroundDesktop ?? config.images?.background?.desktop;
  const mobile = config.images?.backgroundMobile ?? config.images?.background?.mobile;
  if (typeof desktop !== 'string' || !desktop.trim()) fail('backgroundDesktop required');
  if (mobile != null && (typeof mobile !== 'string' || !mobile.trim()))
    fail('invalid backgroundMobile');
  if (typeof config.event?.id !== 'string' || !config.event.id.trim()) fail('event.id required');
  if (!Array.isArray(config.event.names)) fail('event.names must be an array');
  for (const group of ['upload', 'preview', 'messages']) {
    if (
      !config.texts?.[group] ||
      Object.values(config.texts[group]).some((v) => typeof v !== 'string')
    ) {
      fail(`texts.${group} must contain plain strings`);
    }
  }
  for (const value of [
    config.upload?.maxFiles,
    config.upload?.compression?.maxSizeMB,
    config.upload?.compression?.maxWidthOrHeight,
    config.gallery?.thumbnailSize,
  ]) {
    if (!Number.isFinite(value) || value <= 0) fail('limits must be positive numbers');
  }
  if (!Number.isInteger(config.upload.maxFiles)) fail('maxFiles must be an integer');
  for (const value of [config.upload.cooldownMs, config.feedback?.alertDurationMs]) {
    if (!Number.isFinite(value) || value < 0) fail('durations must be non-negative numbers');
  }
  if (config.gallery.mode !== 'local-preview' || config.gallery.remoteEnabled !== false) {
    fail('only local-preview is supported');
  }
  if (config.qr?.mode !== 'external') fail('only external QR metadata is supported');
  if (
    !config.theme?.variables ||
    Object.entries(config.theme.variables).some(
      ([key, value]) => !/^--event-[a-z-]+$/.test(key) || typeof value !== 'string',
    )
  ) {
    fail('theme.variables must contain --event-* CSS strings');
  }
  return config;
}

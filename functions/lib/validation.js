export class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
export function need(condition, message, code = 'invalid-argument') {
  if (!condition) throw new DomainError(code, message);
}
export function text(value, label, max = 200, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return '';
  need(
    typeof value === 'string' && value.trim().length > 0 && value.length <= max,
    `${label}: texto inválido.`,
  );
  return value.trim();
}
export function id(value) {
  need(
    typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value),
    'Identificador inválido.',
  );
  return value;
}
export function integer(value, min, max, label) {
  need(Number.isSafeInteger(value) && value >= min && value <= max, `${label}: número inválido.`);
  return value;
}
export function choice(value, choices, label) {
  need(choices.includes(value), `${label}: opción inválida.`);
  return value;
}
export function url(value, { nullable = false, image = false } = {}) {
  if (nullable && (value === null || value === '')) return null;
  need(typeof value === 'string' && value.length <= 2000, 'URL inválida.');
  if (image && /^asset:(current-background|current-background-mobile)$/.test(value)) return value;
  if (/^\/(?!\/)[\w/.-]+$/.test(value)) return value;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    need(false, 'URL inválida.');
  }
  need(parsed.protocol === 'https:' && !parsed.username && !parsed.password, 'Usa una URL HTTPS.');
  return value;
}
export function requestKey(value) {
  return id(value);
}
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function imageType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  return null;
}

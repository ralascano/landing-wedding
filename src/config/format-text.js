// Plain text interpolation, without HTML or executable configuration values.
export function formatText(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}

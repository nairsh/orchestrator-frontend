export function parseApiTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasTimezone = /(?:Z|[+\-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = hasTimezone
    ? trimmed
    : `${trimmed.replace(' ', 'T')}Z`;

  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? null : ms;
}

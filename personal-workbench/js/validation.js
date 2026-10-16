export function validateNumber(raw, { min, max, step } = {}) {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  const n = Number(raw);
  if (!Number.isFinite(n) || Math.abs(n) > 1e12) return false;
  if (min != null && n < Number(min)) return false;
  if (max != null && n > Number(max)) return false;
  if (step != null && step !== 'any' && Number(step) > 0) {
    const ticks = (n - Number(min || 0)) / Number(step);
    if (Math.abs(ticks - Math.round(ticks)) > 1e-6) return false;
  }
  return true;
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

const SENSITIVE_QUERY_KEYS = new Set(['token', 'key', 'password', 'session', 'auth', 'code', 'state']);

export function redactText(input: string): string {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[PHONE]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[CARD]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[TOKEN]');
}

export function redactUrl(input: string): string {
  try {
    const url = new URL(input);
    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) url.searchParams.set(key, '[REDACTED]');
    }
    return url.toString();
  } catch {
    return redactText(input);
  }
}

export function redactJson<T>(value: T): T {
  if (typeof value === 'string') return redactText(redactUrl(value)) as T;
  if (Array.isArray(value)) return value.map((item) => redactJson(item)) as T;
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (normalized.includes('password') || normalized.includes('cookie') || normalized.includes('token')) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redactJson(item);
    }
  }
  return output as T;
}

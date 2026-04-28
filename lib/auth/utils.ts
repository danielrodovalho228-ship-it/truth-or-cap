// Auth validation helpers — pure functions, no I/O.

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateUsername(raw: string): ValidationResult {
  const v = raw.trim();
  if (v.length < 3) return { ok: false, error: 'Min 3 characters' };
  if (v.length > 20) return { ok: false, error: 'Max 20 characters' };
  if (!USERNAME_RE.test(v)) {
    return { ok: false, error: 'Only letters, numbers, and _. Cannot start with a number.' };
  }
  return { ok: true };
}

export function validateEmail(raw: string): ValidationResult {
  const v = raw.trim();
  if (!v) return { ok: false, error: 'Email is required' };
  if (!EMAIL_RE.test(v)) return { ok: false, error: 'Not a valid email' };
  if (v.length > 254) return { ok: false, error: 'Email too long' };
  return { ok: true };
}

export function validatePassword(raw: string): ValidationResult {
  if (raw.length < 8) return { ok: false, error: 'Min 8 characters' };
  if (raw.length > 72) return { ok: false, error: 'Max 72 characters' };
  return { ok: true };
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Build the absolute URL we redirect to after auth, picking up
 * NEXT_PUBLIC_SITE_URL when set (prod) and falling back to the request origin.
 */
export function getSiteUrl(headerOrigin?: string | null): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (headerOrigin) return headerOrigin.replace(/\/$/, '');
  return 'http://localhost:3000';
}

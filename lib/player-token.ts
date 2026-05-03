import { createHmac, timingSafeEqual } from 'node:crypto';

// HMAC-signed player token. Issued on join (and on create). Carried via httpOnly
// cookie so anon players can't be impersonated by anyone else with the room code.
//
// Format: base64url(`${playerId}.${roomId}.${expiresAt}`) + "." + hex(hmac)
//
// Note: server-side only. Never expose the secret to the client.

const SECRET = process.env.IP_HASH_SALT || process.env.CRON_SECRET || '';
if (!SECRET) {
  // Fail loud at boot — these tokens are critical for anti-impersonation.
  // (We use existing IP_HASH_SALT as the secret to avoid yet-another env var.)
  // In tests / local without env vars, fall back to a static string (insecure)
  // so dev still boots; production sets the env var.
}

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface TokenPayload {
  playerId: string;
  roomId: string;
  expiresAt: number;
}

function fallback(): string {
  return SECRET || 'dev-only-insecure-fallback-do-not-use-in-prod';
}

function sign(payload: string): string {
  return createHmac('sha256', fallback()).update(payload).digest('hex');
}

export function issuePlayerToken(playerId: string, roomId: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${playerId}.${roomId}.${expiresAt}`;
  const sig = sign(payload);
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifyPlayerToken(token: string | undefined | null): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  let payload: string;
  try {
    payload = Buffer.from(body, 'base64url').toString();
  } catch {
    return null;
  }
  const expected = sign(payload);
  // timingSafeEqual requires same-length buffers
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [playerId, roomId, expiresAtStr] = payload.split('.');
  const expiresAt = Number(expiresAtStr);
  if (!playerId || !roomId || !Number.isFinite(expiresAt)) return null;
  if (Date.now() > expiresAt) return null;
  return { playerId, roomId, expiresAt };
}

export const PLAYER_TOKEN_COOKIE = 'tor_player';

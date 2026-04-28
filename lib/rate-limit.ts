// In-memory rate limiter. Resets per Node process — fine for MVP / dev.
// Swap for Redis (Upstash) when we deploy to multi-instance hosting.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: Math.ceil(windowMs / 1000) };
  }

  entry.count += 1;
  const allowed = entry.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  };
}

// Convenience wrappers tuned per-feature.
export const ANALYSES_PER_USER_PER_HOUR = 10;
export const VOTES_PER_IP_PER_HOUR = 30;
export const INVITES_PER_USER_PER_DAY = 50;

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { validateUsername, normalizeUsername } from '@/lib/auth/utils';

export const runtime = 'nodejs';

// Tiny per-IP rate limit so this endpoint can't be hammered for username
// enumeration. Resets per process; fine for MVP, swap for Redis later.
const HIT_WINDOW_MS = 60_000;
const HIT_LIMIT = 30;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + HIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > HIT_LIMIT;
}

export async function GET(req: NextRequest) {
  const usernameRaw = req.nextUrl.searchParams.get('username') ?? '';
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many checks. Slow down.' }, { status: 429 });
  }

  const validation = validateUsername(usernameRaw);
  if (!validation.ok) {
    return NextResponse.json({ available: false, reason: validation.error });
  }

  const username = normalizeUsername(usernameRaw);

  try {
    // Identify caller so we can exclude their own profile from the "taken"
    // check (otherwise users editing their handle in onboarding see false
    // "✗ Taken" when they retype their existing name).
    let currentUserId: string | null = null;
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      currentUserId = data.user?.id ?? null;
    } catch {
      currentUserId = null;
    }

    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (error) {
      console.error('[username-check] lookup failed:', error.message);
      return NextResponse.json({ available: false, reason: 'Lookup failed' }, { status: 500 });
    }

    // Available if: no row found, OR the row is the caller's own profile.
    const available = !data || (currentUserId !== null && data.id === currentUserId);
    return NextResponse.json({ available, username });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[username-check]', msg);
    return NextResponse.json({ available: false, reason: 'Server error' }, { status: 500 });
  }
}

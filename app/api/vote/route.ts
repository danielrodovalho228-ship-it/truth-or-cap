import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, VOTES_PER_IP_PER_HOUR, HOUR_MS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const VoteSchema = z.object({
  gameId: z.string().uuid(),
  vote: z.enum(['truth', 'cap']),
});

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? 'truthorcap_fallback_salt';
  return createHash('sha256').update(`${ip}|${salt}`).digest('hex');
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const { gameId, vote } = parsed.data;

  const ip = clientIp(req);
  const rl = rateLimit(`vote:${ip}`, VOTES_PER_IP_PER_HOUR, HOUR_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Voting too fast. Wait a bit.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
    );
  }

  // Confirm the game exists (and let RLS block votes on private games).
  const supabase = await createClient();
  const { data: game } = await supabase
    .from('games')
    .select('id, is_public, player_id')
    .eq('id', gameId)
    .maybeSingle();
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  // Determine voter identity: authed user, or anonymous IP hash.
  const { data: { user } } = await supabase.auth.getUser();
  const ipHash = user ? null : hashIp(ip);

  // Service role to insert (bypass RLS) but enforce uniqueness via DB
  // unique constraint on (game_id, voter_id) / (game_id, voter_ip_hash).
  const admin = createServiceRoleClient();
  const { error } = await admin.from('votes').insert({
    game_id: gameId,
    voter_id: user?.id ?? null,
    voter_ip_hash: ipHash,
    vote,
  });

  if (error) {
    if (error.code === '23505') {
      // Already voted — set the cookie anyway so the UI proceeds.
      return NextResponse.json({ ok: true, alreadyVoted: true }, {
        headers: voteCookieHeader(gameId),
      });
    }
    console.error('[vote] insert failed:', error);
    return NextResponse.json({ error: 'Vote failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { headers: voteCookieHeader(gameId) });
}

function voteCookieHeader(gameId: string): Record<string, string> {
  return {
    'Set-Cookie': `voted_${gameId}=1; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; HttpOnly${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  };
}

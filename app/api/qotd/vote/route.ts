import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, VOTES_PER_IP_PER_HOUR, HOUR_MS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

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
  // Form-encoded submission from <form action> on /challenge
  const body = await req.formData();
  const qotdId = String(body.get('qotdId') ?? '');
  const vote = String(body.get('vote') ?? '');

  if (!qotdId || !['yes', 'no'].includes(vote)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const ip = clientIp(req);
  const rl = rateLimit(`qotd:${ip}`, VOTES_PER_IP_PER_HOUR, HOUR_MS);
  if (!rl.allowed) {
    return NextResponse.redirect(new URL('/challenge?err=ratelimit', req.url), 303);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ipHash = user ? null : hashIp(ip);

  const admin = createServiceRoleClient();
  const { error } = await admin.from('qotd_votes').insert({
    qotd_id: qotdId,
    voter_id: user?.id ?? null,
    voter_ip_hash: ipHash,
    vote,
  });

  if (error && error.code !== '23505') {
    console.error('[qotd/vote] insert failed:', error);
    return NextResponse.redirect(new URL('/challenge?err=server', req.url), 303);
  }

  // Bump aggregate counter (RPC). Idempotent for duplicate inserts (we
  // only call it on the success path).
  if (!error) {
    await admin.rpc('qotd_bump', { p_qotd_id: qotdId, p_vote: vote });
  }

  return NextResponse.redirect(new URL('/challenge?voted=1', req.url), 303);
}

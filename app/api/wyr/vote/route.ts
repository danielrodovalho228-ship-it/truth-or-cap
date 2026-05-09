import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, VOTES_PER_IP_PER_HOUR, HOUR_MS } from '@/lib/rate-limit';
import { getWyrPrompt } from '@/lib/game-types';
import { buildWyrStats } from '@/lib/wyr';

export const runtime = 'nodejs';

const VoteSchema = z.object({
  questionId: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9_]+$/i, 'invalid id'),
  choice: z.enum(['A', 'B']),
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
  const { questionId, choice } = parsed.data;

  // Reject votes for prompts that don't exist in the catalog. This stops
  // attackers from spraying random ids into the table.
  if (!getWyrPrompt(questionId)) {
    return NextResponse.json({ error: 'Unknown question' }, { status: 404 });
  }

  const ip = clientIp(req);
  const rl = rateLimit(`wyr:${ip}`, VOTES_PER_IP_PER_HOUR, HOUR_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Voting too fast. Wait a bit.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();

  // Upsert: same voter changing their mind updates the row in place.
  // We hand-roll the upsert because the unique indexes are partial, which
  // means PostgREST's `onConflict` can't target them directly without a
  // matching named constraint. We do an UPDATE first, INSERT if no rows.
  const voterFilter = user?.id
    ? { col: 'voter_id', val: user.id }
    : { col: 'voter_ip_hash', val: hashIp(ip) };

  const updateRes = await admin
    .from('wyr_votes')
    .update({ option_chosen: choice })
    .eq('question_id', questionId)
    .eq(voterFilter.col, voterFilter.val)
    .select('id');

  if (updateRes.error) {
    console.error('[wyr/vote] update failed:', updateRes.error);
    return NextResponse.json({ error: 'Vote failed' }, { status: 500 });
  }

  if (!updateRes.data || updateRes.data.length === 0) {
    const insertRes = await admin.from('wyr_votes').insert({
      question_id: questionId,
      option_chosen: choice,
      voter_id: user?.id ?? null,
      voter_ip_hash: user ? null : hashIp(ip),
    });
    if (insertRes.error) {
      if (insertRes.error.code === '23505') {
        // Race: another request from the same voter inserted between our
        // UPDATE and INSERT. Re-run the UPDATE so the user's latest pick
        // (this request) ends up authoritative instead of whichever
        // arrived first.
        const retry = await admin
          .from('wyr_votes')
          .update({ option_chosen: choice })
          .eq('question_id', questionId)
          .eq(voterFilter.col, voterFilter.val);
        if (retry.error) {
          console.error('[wyr/vote] retry update failed:', retry.error);
          return NextResponse.json({ error: 'Vote failed' }, { status: 500 });
        }
      } else {
        console.error('[wyr/vote] insert failed:', insertRes.error);
        return NextResponse.json({ error: 'Vote failed' }, { status: 500 });
      }
    }
  }

  // Pull updated tallies via the service-role client. The RPC is
  // SECURITY DEFINER so anon would also work, but we already have admin.
  const { data: rpc, error: rpcErr } = await admin.rpc('wyr_question_stats', {
    p_question_id: questionId,
  });
  if (rpcErr) {
    console.error('[wyr/vote] stats rpc failed:', rpcErr);
    return NextResponse.json({ error: 'Stats unavailable' }, { status: 500 });
  }
  const row = Array.isArray(rpc) ? rpc[0] : rpc;
  const stats = buildWyrStats({
    questionId,
    votesA: Number(row?.votes_a ?? 0),
    votesB: Number(row?.votes_b ?? 0),
    total: Number(row?.total ?? 0),
  });

  return NextResponse.json({
    ok: true,
    choice,
    stats,
  });
}

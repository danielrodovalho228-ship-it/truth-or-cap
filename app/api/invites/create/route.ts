import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, INVITES_PER_USER_PER_DAY, DAY_MS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const Schema = z.object({
  context: z.enum(['curiosity', 'streak', 'challenge', 'group', 'leaderboard', 'manual']),
  channel: z.enum(['whatsapp', 'sms', 'copy', 'qr', 'native_share']),
  inviteePhoneHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  sourceGameId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`invite:${user.id}`, INVITES_PER_USER_PER_DAY, DAY_MS);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Daily invite limit reached.' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const { context, channel, inviteePhoneHash, sourceGameId } = parsed.data;

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      inviter_id: user.id,
      invitee_phone_hash: inviteePhoneHash ?? null,
      channel,
      context,
      source_game_id: sourceGameId ?? null,
    })
    .select('invite_code')
    .single();

  if (error || !data) {
    console.error('[invites/create] insert failed:', error);
    return NextResponse.json({ error: 'Could not create invite' }, { status: 500 });
  }

  void supabase.rpc('increment_invites_sent', { p_user_id: user.id });

  return NextResponse.json({ inviteCode: data.invite_code });
}

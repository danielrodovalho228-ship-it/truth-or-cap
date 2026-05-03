import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Schema = z.object({
  inviteCode: z.string().min(4).max(32),
});

export async function POST(req: NextRequest) {
  // CSRF defense: only same-origin POST
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  const admin = createServiceRoleClient();

  const { data: invite } = await admin
    .from('invitations')
    .select('id, inviter_id, source_game_id, context, redeemed_at, expires_at')
    .eq('invite_code', parsed.data.inviteCode)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.inviter_id === user.id) {
    return NextResponse.json({ error: 'Cannot redeem your own invite' }, { status: 400 });
  }
  if (invite.redeemed_at) {
    return NextResponse.json({ error: 'Invite already redeemed' }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
  }

  // Mark redeemed
  await admin
    .from('invitations')
    .update({ redeemed_at: new Date().toISOString(), redeemed_by_user_id: user.id })
    .eq('id', invite.id);

  // Bump inviter's redeemed counter (read current, then write +1).
  // Not strictly atomic — for an MVP this is fine. Add an RPC later when
  // race conditions matter.
  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('total_invites_redeemed')
    .eq('id', invite.inviter_id)
    .single();
  const nextCount = (inviterProfile?.total_invites_redeemed ?? 0) + 1;
  await admin
    .from('profiles')
    .update({ total_invites_redeemed: nextCount })
    .eq('id', invite.inviter_id);

  // Mutual friendship
  const rows = [
    { user_id: user.id, friend_id: invite.inviter_id, source: 'invite' as const },
    { user_id: invite.inviter_id, friend_id: user.id, source: 'invite' as const },
  ];
  await admin.from('friendships').upsert(rows, { onConflict: 'user_id,friend_id', ignoreDuplicates: true });

  return NextResponse.json({
    ok: true,
    inviterId: invite.inviter_id,
    sourceGameId: invite.source_game_id,
    context: invite.context,
  });
}

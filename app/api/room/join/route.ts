import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { joinRoom } from '@/lib/rooms';
import { issuePlayerToken, PLAYER_TOKEN_COOKIE } from '@/lib/player-token';
import { isPremiumAsync } from '@/lib/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { code?: string; displayName?: string; avatar?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const code = (body.code ?? '').trim().toUpperCase();
  const displayName = (body.displayName ?? '').trim();
  if (!code || code.length < 4) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: 'Display name required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  try {
    // Spicy gate on join — must be premium (or override env) for spicy rooms
    // (peek at room first; joinRoom will re-validate).
    const { data: roomPeek } = await admin
      .from('rooms')
      .select('id, spice')
      .eq('code', code)
      .maybeSingle();
    if (roomPeek?.spice === 'spicy') {
      const allowed = (await isPremiumAsync(user?.id ?? null))
        || process.env.ALLOW_SPICY_FOR_ALL === '1';
      if (!allowed) {
        return NextResponse.json(
          { error: 'Spicy room — Premium required to join', upsellUrl: '/premium' },
          { status: 403 },
        );
      }
    }

    const { room, player } = await joinRoom(admin, {
      code,
      userId: user?.id ?? null,
      displayName,
      avatar: body.avatar,
    });

    // Issue HMAC playerToken so future vote/upload from this player are
    // proven to be them, even for anonymous joins.
    const token = issuePlayerToken(player.id, room.id);
    const res = NextResponse.json({ room, player });
    res.cookies.set(PLAYER_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to join room';
    const status = msg === 'Room not found' ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

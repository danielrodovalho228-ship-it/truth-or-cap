import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyPlayerToken, PLAYER_TOKEN_COOKIE } from '@/lib/player-token';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

// Mark a player as having left the room. Sets left_at = now() so the host's
// reveal logic + capacity trigger see them as gone. Authenticated by either
// session.user_id matching room_players.user_id, OR by HMAC playerToken cookie.
export async function POST(req: NextRequest) {
  let body: { roomId?: string; playerId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roomId, playerId } = body;
  if (!roomId || !playerId) {
    return NextResponse.json({ error: 'roomId and playerId required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  const { data: player } = await admin
    .from('room_players')
    .select('id, user_id, room_id, left_at')
    .eq('id', playerId)
    .eq('room_id', roomId)
    .single();
  if (!player) return NextResponse.json({ error: 'Not in this room' }, { status: 404 });
  if (player.left_at) return NextResponse.json({ ok: true, alreadyLeft: true });

  // Identity gate
  if (user) {
    if (player.user_id && player.user_id !== user.id) {
      return NextResponse.json({ error: 'Cannot leave for another user' }, { status: 403 });
    }
  } else {
    const cookieStore = await cookies();
    const token = cookieStore.get(PLAYER_TOKEN_COOKIE)?.value;
    const verified = verifyPlayerToken(token);
    if (!verified || verified.playerId !== playerId || verified.roomId !== roomId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 403 });
    }
  }

  await admin.from('room_players').update({ left_at: new Date().toISOString() }).eq('id', playerId);
  return NextResponse.json({ ok: true });
}

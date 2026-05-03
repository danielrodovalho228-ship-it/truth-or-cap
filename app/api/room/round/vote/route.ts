import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { roundId?: string; voterPlayerId?: string; vote?: 'truth' | 'cap' };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roundId, voterPlayerId, vote } = body;
  if (!roundId || !voterPlayerId || !vote) {
    return NextResponse.json({ error: 'roundId, voterPlayerId, vote required' }, { status: 400 });
  }
  if (!['truth','cap'].includes(vote)) {
    return NextResponse.json({ error: 'vote must be truth or cap' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, room_id, prompter_player_id, revealed_at')
    .eq('id', roundId)
    .single();
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  if (round.prompter_player_id === voterPlayerId) {
    return NextResponse.json({ error: 'Prompter cannot vote on own round' }, { status: 403 });
  }
  if (round.revealed_at) {
    return NextResponse.json({ error: 'Round already revealed' }, { status: 409 });
  }

  const { data: player } = await admin
    .from('room_players')
    .select('id, user_id')
    .eq('id', voterPlayerId)
    .eq('room_id', round.room_id)
    .single();
  if (!player) return NextResponse.json({ error: 'Not in this room' }, { status: 403 });

  // Enforce identity: authed users must vote with their own player row.
  // Anonymous voters: at minimum, the player record must exist with user_id = null
  // (a slot they joined). Ideal future: signed token on join.
  if (user) {
    if (player.user_id && player.user_id !== user.id) {
      return NextResponse.json({ error: 'You do not own that player' }, { status: 403 });
    }
  } else {
    if (player.user_id) {
      // Authed slot can't be voted for by anon caller.
      return NextResponse.json({ error: 'This slot belongs to a registered user' }, { status: 403 });
    }
  }

  const { error } = await admin
    .from('round_votes')
    .upsert({ round_id: roundId, voter_player_id: voterPlayerId, vote }, { onConflict: 'round_id,voter_player_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

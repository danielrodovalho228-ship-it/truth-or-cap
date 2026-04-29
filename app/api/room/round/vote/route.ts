import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

  const admin = createServiceRoleClient();
  // Verify voter is in the room of this round.
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, room_id, prompter_player_id')
    .eq('id', roundId)
    .single();
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  if (round.prompter_player_id === voterPlayerId) {
    return NextResponse.json({ error: 'Prompter cannot vote on own round' }, { status: 403 });
  }
  const { data: player } = await admin
    .from('room_players')
    .select('id')
    .eq('id', voterPlayerId)
    .eq('room_id', round.room_id)
    .single();
  if (!player) return NextResponse.json({ error: 'Not in this room' }, { status: 403 });

  // Upsert vote.
  const { error } = await admin
    .from('round_votes')
    .upsert({ round_id: roundId, voter_player_id: voterPlayerId, vote }, { onConflict: 'round_id,voter_player_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

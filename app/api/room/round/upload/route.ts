import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: { roundId?: string; playerId?: string; recordingUrl?: string; declaredAnswer?: 'truth' | 'cap' };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roundId, playerId, recordingUrl, declaredAnswer } = body;
  if (!roundId || !recordingUrl || !declaredAnswer) {
    return NextResponse.json({ error: 'roundId, recordingUrl, declaredAnswer required' }, { status: 400 });
  }
  if (!['truth','cap'].includes(declaredAnswer)) {
    return NextResponse.json({ error: 'declaredAnswer must be truth or cap' }, { status: 400 });
  }

  // Path must be inside the rooms/ prefix and reference this round's id (or at least be a webm).
  if (!/^rooms\/[A-Za-z0-9-]+\.webm$/.test(recordingUrl)) {
    return NextResponse.json({ error: 'Invalid recording path' }, { status: 400 });
  }
  if (!recordingUrl.includes(roundId)) {
    return NextResponse.json({ error: 'recordingUrl must include roundId' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, prompter_player_id, room_id, recording_url')
    .eq('id', roundId)
    .single();
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  if (round.recording_url) return NextResponse.json({ error: 'Already uploaded' }, { status: 409 });

  // Verify caller is the prompter. Authed: user.id matches prompter player's user_id.
  // Anon: must supply playerId == prompter_player_id.
  const { data: prompter } = await admin
    .from('room_players')
    .select('id, user_id')
    .eq('id', round.prompter_player_id)
    .single();
  if (!prompter) return NextResponse.json({ error: 'Prompter not found' }, { status: 404 });

  if (user) {
    if (prompter.user_id && prompter.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the round prompter can upload' }, { status: 403 });
    }
  } else {
    // Anonymous prompter must prove identity by supplying playerId == prompter id.
    if (!playerId || playerId !== prompter.id) {
      return NextResponse.json({ error: 'Only the round prompter can upload' }, { status: 403 });
    }
  }

  const { data: updated, error } = await admin
    .from('room_rounds')
    .update({ recording_url: recordingUrl, declared_answer: declaredAnswer })
    .eq('id', roundId)
    .is('recording_url', null)
    .select()
    .single();
  if (error || !updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json({ round: updated });
}

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: { roundId?: string; recordingUrl?: string; declaredAnswer?: 'truth' | 'cap' };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roundId, recordingUrl, declaredAnswer } = body;
  if (!roundId || !recordingUrl || !declaredAnswer) {
    return NextResponse.json({ error: 'roundId, recordingUrl, declaredAnswer required' }, { status: 400 });
  }
  if (!['truth','cap'].includes(declaredAnswer)) {
    return NextResponse.json({ error: 'declaredAnswer must be truth or cap' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  // Verify caller is the prompter for this round.
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, prompter_player_id, room_id')
    .eq('id', roundId)
    .single();
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

  if (user) {
    const { data: prompter } = await admin
      .from('room_players')
      .select('user_id')
      .eq('id', round.prompter_player_id)
      .single();
    if (prompter && prompter.user_id && prompter.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the round prompter can upload' }, { status: 403 });
    }
  }

  const { data: updated, error } = await admin
    .from('room_rounds')
    .update({
      recording_url: recordingUrl,
      declared_answer: declaredAnswer,
    })
    .eq('id', roundId)
    .select()
    .single();
  if (error || !updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json({ round: updated });
}

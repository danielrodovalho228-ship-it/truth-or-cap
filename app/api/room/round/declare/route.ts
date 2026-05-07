import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';
import { verifyPlayerToken, PLAYER_TOKEN_COOKIE } from '@/lib/player-token';

export const runtime = 'nodejs';

// Text-based declaration: the round's prompter picks truth or cap (no recording).
// This is the v2 replacement for /api/room/round/upload.
export async function POST(req: NextRequest) {
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

  let body: { roundId?: string; playerId?: string; declaredAnswer?: 'truth' | 'cap' };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roundId, playerId, declaredAnswer } = body;
  if (!roundId || !declaredAnswer) {
    return NextResponse.json({ error: 'roundId and declaredAnswer required' }, { status: 400 });
  }
  if (!['truth','cap'].includes(declaredAnswer)) {
    return NextResponse.json({ error: 'declaredAnswer must be truth or cap' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, prompter_player_id, room_id, declared_answer, revealed_at')
    .eq('id', roundId)
    .single();
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  if (round.revealed_at) return NextResponse.json({ error: 'Round already revealed' }, { status: 409 });
  if (round.declared_answer) return NextResponse.json({ error: 'Already declared' }, { status: 409 });
  if (!round.prompter_player_id) {
    // Quick-mode rounds don't have a prompter — there's nothing to declare.
    return NextResponse.json({ error: 'Quick-mode round has no prompter' }, { status: 400 });
  }

  const { data: prompter } = await admin
    .from('room_players')
    .select('id, user_id')
    .eq('id', round.prompter_player_id)
    .single();
  if (!prompter) return NextResponse.json({ error: 'Prompter not found' }, { status: 404 });

  // Identity gate, mirroring /upload — only the prompter can declare.
  if (user && prompter.user_id) {
    if (prompter.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the prompter can declare' }, { status: 403 });
    }
  } else {
    if (!playerId || playerId !== prompter.id) {
      return NextResponse.json({ error: 'Only the prompter can declare' }, { status: 403 });
    }
    const cookieStore = await cookies();
    const token = cookieStore.get(PLAYER_TOKEN_COOKIE)?.value;
    const verified = verifyPlayerToken(token);
    if (!verified || verified.playerId !== playerId || verified.roomId !== round.room_id) {
      return NextResponse.json({ error: 'Player session invalid; rejoin the room.' }, { status: 403 });
    }
  }

  const { data: updated, error } = await admin
    .from('room_rounds')
    .update({ declared_answer: declaredAnswer })
    .eq('id', roundId)
    .is('declared_answer', null)
    .select()
    .single();
  if (error || !updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json({ round: updated });
}

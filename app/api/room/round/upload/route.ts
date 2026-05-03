import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';
import { verifyPlayerToken, PLAYER_TOKEN_COOKIE } from '@/lib/player-token';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

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

  let body: { roundId?: string; playerId?: string; recordingUrl?: string; declaredAnswer?: 'truth' | 'cap' };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roundId, playerId, recordingUrl, declaredAnswer } = body;
  if (!roundId || !recordingUrl || !declaredAnswer) {
    return NextResponse.json({ error: 'roundId, recordingUrl, declaredAnswer required' }, { status: 400 });
  }
  if (!['truth','cap'].includes(declaredAnswer)) {
    return NextResponse.json({ error: 'declaredAnswer must be truth or cap' }, { status: 400 });
  }

  // Path must be rooms/{roundId}{optional-suffix}.{webm|mp4} — supports
  // iOS Safari which records mp4, plus client-side dedup suffix (e.g. timestamp).
  const pathRe = new RegExp('^rooms/' + roundId.replace(/[^A-Za-z0-9-]/g, '') + '[A-Za-z0-9-]*\\.(webm|mp4)$');
  if (!pathRe.test(recordingUrl)) {
    return NextResponse.json({ error: 'Invalid recording path' }, { status: 400 });
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

  // Identity gate: if prompter slot is anon (user_id IS NULL), the caller
  // must always present a valid HMAC playerToken cookie. Authed users
  // can only claim their own slot via session.
  if (user && prompter.user_id) {
    if (prompter.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the round prompter can upload' }, { status: 403 });
    }
  } else {
    // Anonymous prompter: must hold a valid HMAC playerToken cookie from join.
    if (!playerId || playerId !== prompter.id) {
      return NextResponse.json({ error: 'Only the round prompter can upload' }, { status: 403 });
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
    .update({ recording_url: recordingUrl, declared_answer: declaredAnswer })
    .eq('id', roundId)
    .is('recording_url', null)
    .select()
    .single();
  if (error || !updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json({ round: updated });
}

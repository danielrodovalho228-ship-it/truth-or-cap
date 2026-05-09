import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';
import { awardXpForUser, XP_VALUES } from '@/lib/xp';

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

  let body: { roundId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roundId } = body;
  if (!roundId) return NextResponse.json({ error: 'roundId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, room_id, prompter_player_id, declared_answer')
    .eq('id', roundId)
    .single();
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

  const { data: room } = await admin.from('rooms').select('host_user_id').eq('id', round.room_id).single();
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (user?.id !== room.host_user_id) {
    return NextResponse.json({ error: 'Only host can reveal' }, { status: 403 });
  }

  // Idempotent reveal: only the first call wins.
  const { data: updated } = await admin
    .from('room_rounds')
    .update({ revealed_at: new Date().toISOString() })
    .eq('id', roundId)
    .is('revealed_at', null)
    .select()
    .maybeSingle();

  if (!updated) {
    const { data: existing } = await admin
      .from('room_rounds')
      .select('*')
      .eq('id', roundId)
      .single();
    return NextResponse.json({ round: existing, alreadyRevealed: true });
  }

  // Award XP. Best-effort — swallow failures so XP errors never block the
  // reveal — but DO await: fire-and-forget after `return` is killed by
  // Vercel's serverless teardown before the RPCs commit, so every reveal
  // was silently dropping XP for everyone in the round.
  try {
    await awardRoundXp(admin, round.id, round.room_id, round.prompter_player_id, round.declared_answer);
  } catch (e) {
    console.error('[reveal] xp award failed:', e);
  }

  return NextResponse.json({ round: updated });
}

async function awardRoundXp(
  admin: ReturnType<typeof createServiceRoleClient>,
  roundId: string,
  roomId: string,
  prompterPlayerId: string | null,
  declaredAnswer: string | null,
): Promise<void> {
  // Quick-mode rounds have no single prompter — every active player is a
  // participant. Fan game_complete out to all of them and skip the
  // correct-verdict path (no declared answer to be right about).
  if (!prompterPlayerId) {
    const { data: activePlayers } = await admin
      .from('room_players')
      .select('user_id')
      .eq('room_id', roomId)
      .is('left_at', null);
    for (const p of activePlayers ?? []) {
      if (!p.user_id) continue;
      await awardXpForUser(
        admin,
        p.user_id,
        'game_complete',
        XP_VALUES.game_complete,
        { roundId, role: 'quick_participant' },
      );
    }
    return;
  }

  // Classic mode: prompter gets game_complete (if logged in).
  const { data: prompter } = await admin
    .from('room_players')
    .select('user_id')
    .eq('id', prompterPlayerId)
    .single();
  if (prompter?.user_id) {
    await awardXpForUser(
      admin,
      prompter.user_id,
      'game_complete',
      XP_VALUES.game_complete,
      { roundId, role: 'prompter' },
    );
  }

  // Correct verdict → every voter who guessed declared_answer.
  if (declaredAnswer !== 'truth' && declaredAnswer !== 'cap') return;

  const { data: votes } = await admin
    .from('round_votes')
    .select('voter_player_id, vote')
    .eq('round_id', roundId);
  if (!votes || votes.length === 0) return;

  const correctVoterIds = votes
    .filter((v) => v.vote === declaredAnswer)
    .map((v) => v.voter_player_id);
  if (correctVoterIds.length === 0) return;

  const { data: players } = await admin
    .from('room_players')
    .select('id, user_id')
    .in('id', correctVoterIds);

  for (const p of players ?? []) {
    if (!p.user_id) continue;
    await awardXpForUser(
      admin,
      p.user_id,
      'correct_verdict',
      XP_VALUES.correct_verdict,
      { roundId, role: 'voter' },
    );
  }
}

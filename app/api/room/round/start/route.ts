import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { startNextRound, MIN_PLAYERS_TO_START } from '@/lib/rooms';

export const runtime = 'nodejs';

const MAX_CUSTOM_LEN = 240;

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

  let body: {
    roomId?: string;
    prompterPlayerId?: string | null;
    customQuestion?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roomId, prompterPlayerId, customQuestion } = body;
  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }

  const trimmedCustom = typeof customQuestion === 'string' ? customQuestion.trim() : '';
  if (trimmedCustom && trimmedCustom.length > MAX_CUSTOM_LEN) {
    return NextResponse.json(
      { error: `Custom question too long (${MAX_CUSTOM_LEN} chars max)` },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  // Verify caller is host of this room.
  const { data: room } = await admin
    .from('rooms')
    .select('host_user_id, quick_mode, min_players, current_round, max_rounds')
    .eq('id', roomId)
    .single();
  if (!room || room.host_user_id !== user.id) {
    return NextResponse.json({ error: 'Only host can start rounds' }, { status: 403 });
  }

  if (room.current_round >= room.max_rounds) {
    return NextResponse.json({ error: 'Game is finished' }, { status: 409 });
  }

  // Min-players gate: count active (non-left) players. Host counts too.
  const { count: activeCount } = await admin
    .from('room_players')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .is('left_at', null);
  const minPlayers = Math.max(room.min_players ?? MIN_PLAYERS_TO_START, MIN_PLAYERS_TO_START);
  if ((activeCount ?? 0) < minPlayers) {
    return NextResponse.json(
      { error: `Need at least ${minPlayers} players to start` },
      { status: 409 },
    );
  }

  // Quick mode never has a prompter; classic mode requires one.
  if (!room.quick_mode && !prompterPlayerId) {
    return NextResponse.json({ error: 'prompterPlayerId required' }, { status: 400 });
  }

  // Validate that prompter (if set) actually belongs to this room.
  if (prompterPlayerId) {
    const { data: prompter } = await admin
      .from('room_players')
      .select('id')
      .eq('id', prompterPlayerId)
      .eq('room_id', roomId)
      .is('left_at', null)
      .maybeSingle();
    if (!prompter) {
      return NextResponse.json({ error: 'Prompter not in this room' }, { status: 400 });
    }
  }

  try {
    const round = await startNextRound(admin, {
      roomId,
      prompterPlayerId: prompterPlayerId ?? null,
      customQuestion: trimmedCustom || undefined,
      durationSeconds: 60,
    });
    return NextResponse.json({ round });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to start round';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

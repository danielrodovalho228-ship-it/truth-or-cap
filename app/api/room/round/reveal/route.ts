import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';

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
    .select('id, room_id, prompter_player_id')
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

  return NextResponse.json({ round: updated });
}

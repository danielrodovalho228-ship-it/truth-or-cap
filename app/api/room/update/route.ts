import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ROUND_OPTIONS } from '@/lib/rooms';

export const runtime = 'nodejs';

// Host-only lobby tweaks (rounds count, quick mode). Only allowed before the
// first round starts — once the game is in progress these are frozen.
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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { roomId?: string; maxRounds?: number; quickMode?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roomId, maxRounds, quickMode } = body;
  if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from('rooms')
    .select('host_user_id, current_round, status')
    .eq('id', roomId)
    .single();
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.host_user_id !== user.id) {
    return NextResponse.json({ error: 'Only host can update' }, { status: 403 });
  }
  if (room.current_round > 0 || room.status !== 'lobby') {
    return NextResponse.json(
      { error: 'Settings frozen once the game starts' },
      { status: 409 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (maxRounds !== undefined) {
    if (!(ROUND_OPTIONS as readonly number[]).includes(Number(maxRounds))) {
      return NextResponse.json({ error: 'Invalid maxRounds' }, { status: 400 });
    }
    patch.max_rounds = Number(maxRounds);
  }
  if (quickMode !== undefined) {
    patch.quick_mode = quickMode === true;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from('rooms')
    .update(patch)
    .eq('id', roomId)
    .select()
    .single();
  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ room: updated });
}

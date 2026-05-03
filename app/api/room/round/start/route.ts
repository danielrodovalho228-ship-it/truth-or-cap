import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { startNextRound } from '@/lib/rooms';

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { roomId?: string; prompterPlayerId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { roomId, prompterPlayerId } = body;
  if (!roomId || !prompterPlayerId) {
    return NextResponse.json({ error: 'roomId and prompterPlayerId required' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  // Verify caller is host of this room.
  const { data: room } = await admin.from('rooms').select('host_user_id').eq('id', roomId).single();
  if (!room || room.host_user_id !== user.id) {
    return NextResponse.json({ error: 'Only host can start rounds' }, { status: 403 });
  }

  try {
    const round = await startNextRound(admin, roomId, prompterPlayerId, 30);
    return NextResponse.json({ round });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to start round';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

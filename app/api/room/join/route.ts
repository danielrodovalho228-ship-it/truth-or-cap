import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { joinRoom } from '@/lib/rooms';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { code?: string; displayName?: string; avatar?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const code = (body.code ?? '').trim().toUpperCase();
  const displayName = (body.displayName ?? '').trim();
  if (!code || code.length < 4) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: 'Display name required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  try {
    const { room, player } = await joinRoom(admin, {
      code,
      userId: user?.id ?? null,
      displayName,
      avatar: body.avatar,
    });
    return NextResponse.json({ room, player });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to join room';
    const status = msg === 'Room not found' ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createRoom, type RoomMode, type RoomSpice } from '@/lib/rooms';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required to host a room' }, { status: 401 });
  }

  let body: { mode?: RoomMode; spice?: RoomSpice; locale?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const mode = body.mode ?? 'group';
  const spice = body.spice ?? 'mild';
  const locale = body.locale ?? 'en';
  const displayName = (body.displayName ?? '').trim() || user.email?.split('@')[0] || 'Host';

  if (!['family','couple','group'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }
  if (!['mild','spicy'].includes(spice)) {
    return NextResponse.json({ error: 'Invalid spice' }, { status: 400 });
  }
  if (spice === 'spicy') {
    // TODO: paywall check via profiles.is_premium
    return NextResponse.json({ error: 'Spicy pack requires Premium' }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  try {
    const { room, player } = await createRoom(admin, {
      hostUserId: user.id,
      hostDisplayName: displayName,
      mode, spice, locale,
    });
    return NextResponse.json({ room, player });
  } catch (err) {
    console.error('[room/create] failed:', err);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

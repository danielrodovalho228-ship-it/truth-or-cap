import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { RoomClient } from './RoomClient';

export const dynamic = 'force-dynamic';

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const codeUpper = code.toUpperCase();

  const admin = createServiceRoleClient();
  const { data: room } = await admin.from('rooms').select('*').eq('code', codeUpper).maybeSingle();
  if (!room) notFound();

  const { data: players } = await admin
    .from('room_players')
    .select('*')
    .eq('room_id', room.id)
    .order('joined_at');

  const { data: currentRound } = await admin
    .from('room_rounds')
    .select('*')
    .eq('room_id', room.id)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <RoomClient
      initialRoom={room}
      initialPlayers={players ?? []}
      initialRound={currentRound ?? null}
    />
  );
}

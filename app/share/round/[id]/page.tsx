import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ShareCard } from './ShareCard';

export const dynamic = 'force-dynamic';

export default async function ShareRoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, question, sus_level, declared_answer, analysis_summary, room_id')
    .eq('id', id)
    .maybeSingle();
  if (!round) notFound();

  const { data: room } = await admin.from('rooms').select('code').eq('id', round.room_id).single();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://truthorcapapp.com';
  const imageUrl = `${baseUrl}/share/round/${id}/story-image`;
  const inviteUrl = room ? `${baseUrl}/room/${room.code}` : baseUrl;

  return (
    <ShareCard
      sus={Math.round(Number(round.sus_level ?? 50))}
      question={round.question}
      declared={round.declared_answer ?? 'truth'}
      imageUrl={imageUrl}
      inviteUrl={inviteUrl}
    />
  );
}

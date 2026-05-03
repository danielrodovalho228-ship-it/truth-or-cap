import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ShareCard } from './ShareCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://truthorcapapp.com';
  const imageUrl = `${baseUrl}/share/round/${id}/story-image`;
  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('question, sus_level')
    .eq('id', id)
    .maybeSingle();
  const sus = Math.round(Number(round?.sus_level ?? 50));
  const title = `SUS LEVEL ${sus}% - Truth or Cap`;
  const description = round?.question ? `"${round.question}" - was it cap?` : 'Truth or Cap - AI lie detector party game.';
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: imageUrl }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
  };
}

export default async function ShareRoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createServiceRoleClient();
  const { data: round } = await admin
    .from('room_rounds')
    .select('id, question, sus_level, declared_answer, analysis_summary, room_id, revealed_at')
    .eq('id', id)
    .maybeSingle();
  if (!round) notFound();
  if (!round.revealed_at) {
    // Hide unrevealed share pages from public.
    return (
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-violet-100 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-2xl font-display font-black text-violet-900">Not revealed yet</p>
          <p className="text-violet-700/80 mt-2">Share this after the round ends.</p>
        </div>
      </main>
    );
  }
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

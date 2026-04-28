import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { ProcessingClient } from './ProcessingClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProcessingPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser(`/jogo/${id}/processing`);

  const supabase = await createClient();
  const { data: game } = await supabase
    .from('games')
    .select('id, player_id, question, declared_answer, recording_duration_ms')
    .eq('id', id)
    .single();

  if (!game) notFound();
  // Only the owner can sit on the processing screen — viewers go straight
  // to /jogo/[id] which gates on viewState.
  if (game.player_id !== user.id) notFound();

  return <ProcessingClient gameId={game.id} question={game.question} />;
}

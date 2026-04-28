import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Home · Truth or Cap',
  robots: { index: false },
};

export default async function HomePage() {
  const user = await requireUser('/home');
  const supabase = await createClient();

  const { data: friendIds } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', user.id);
  const ids = (friendIds ?? []).map((f) => f.friend_id);

  const { data: feed } = ids.length
    ? await supabase
        .from('games')
        .select('id, player_username, question, declared_answer, created_at')
        .in('player_id', ids)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <header className="flex items-center justify-between mb-6">
          <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg">
            ← truthorcap
          </Link>
          <Link href="/jogo/select">
            <Button size="sm">+ New game</Button>
          </Link>
        </header>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">Feed</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-6">
          Who&apos;s<br />
          <span className="italic font-light">on trial?</span>
        </h1>

        {(feed?.length ?? 0) > 0 ? (
          <ul className="space-y-2">
            {feed!.map((g) => (
              <li key={g.id}>
                <Link href={`/jogo/${g.id}`} className="block border-2 border-line hover:border-fg p-4 transition-colors">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-2">
                    @{g.player_username} · {new Date(g.created_at).toLocaleString()}
                  </p>
                  <p className="font-display text-lg leading-snug mb-2">&ldquo;{g.question}&rdquo;</p>
                  <p className={cn(
                    'font-mono text-[10px] tracking-widest uppercase',
                    g.declared_answer === 'truth' ? 'text-acid' : 'text-blood'
                  )}>
                    Claims: {g.declared_answer.toUpperCase()} · Tap to vote
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-2 border-line p-6 text-center">
            <p className="font-display text-2xl font-black leading-tight mb-2">
              No friend games yet.
            </p>
            <p className="font-body text-sm text-fg-muted mb-4 leading-snug">
              Add friends to see their plays here. Or record your own to start.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/jogo/select"><Button size="md" fullWidth>Record a game</Button></Link>
              <Link href="/onboarding/friends"><Button variant="secondary" size="md" fullWidth>Find friends</Button></Link>
            </div>
          </div>
        )}
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

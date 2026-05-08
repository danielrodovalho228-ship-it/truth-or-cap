import Link from 'next/link';
import type { Metadata } from 'next';
import { Radio, Sparkles, Users, Trophy } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { GameBanner } from '@/components/layout/GameBanner';
import { GameCard } from '@/components/layout/GameCard';
import { StreakBadge } from '@/components/layout/StreakBadge';
import { ALL_GAME_TYPES } from '@/lib/game-types';
import { recordDailyPlay } from '@/lib/xp';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Home · Truth or Cap',
  robots: { index: false },
};

export default async function HomePage() {
  const user = await requireUser('/home');
  const supabase = await createClient();

  // Daily login: bumps streak + grants the once-per-day XP bonus.
  // Idempotent — safe to call on every visit.
  const dailyState = await recordDailyPlay(supabase);

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

  const featured = ALL_GAME_TYPES.slice(0, 3);

  const streak = dailyState?.current_streak ?? 0;
  const level = dailyState?.current_level ?? 1;
  const totalXp = dailyState?.total_xp ?? 0;

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 px-6 py-6 max-w-md mx-auto w-full">
        <GameBanner variant="hero" subtitle="Spot the cap. Become the cap." />

        <StreakBadge currentStreak={streak} level={level} totalXp={totalXp} />

        {/* Quick action chips */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Link
            href="/game/select"
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-line bg-bg-card p-3 hover:border-fg transition-colors"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#5b6cf6] to-[#8b5cf6] text-white">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="font-mono text-[10px] tracking-widest uppercase">New</span>
          </Link>
          <Link
            href="/friends"
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-line bg-bg-card p-3 hover:border-fg transition-colors"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#0ea5e9] text-white">
              <Users className="w-4 h-4" />
            </span>
            <span className="font-mono text-[10px] tracking-widest uppercase">Friends</span>
          </Link>
          <Link
            href="/leaderboard"
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-line bg-bg-card p-3 hover:border-fg transition-colors"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#f87171] text-white">
              <Trophy className="w-4 h-4" />
            </span>
            <span className="font-mono text-[10px] tracking-widest uppercase">Rank</span>
          </Link>
        </div>

        {/* Live multiplayer hero */}
        <Link
          href="/online"
          className="relative block overflow-hidden rounded-2xl mb-6 shadow-sm group"
          style={{
            backgroundImage:
              'linear-gradient(135deg, #5b6cf6 0%, #14b8a6 100%)',
          }}
        >
          <span className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <span className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-black/20 blur-3xl" />
          <div className="relative flex items-center gap-3 p-4 text-white">
            <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
              <Radio className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-80">
                Live · up to 10 phones
              </p>
              <p className="font-display text-xl font-black leading-tight">
                Play online — multiplayer
              </p>
            </div>
            <span className="font-display font-black text-2xl leading-none transition-transform group-hover:translate-x-1">→</span>
          </div>
        </Link>

        {/* Feed */}
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard">Feed</p>
          <Link href="/game/select" className="font-mono text-[10px] tracking-[0.3em] uppercase text-fg-muted hover:text-fg">
            + New
          </Link>
        </div>

        {(feed?.length ?? 0) > 0 ? (
          <ul className="space-y-2 mb-8">
            {feed!.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/game/${g.id}`}
                  className="block rounded-xl border-2 border-line bg-bg-card hover:border-fg p-4 transition-colors"
                >
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
          <div className="rounded-2xl border-2 border-line bg-bg-card p-6 text-center mb-8 overflow-hidden relative">
            <span className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-[#5b6cf6]/20 to-[#ec4899]/20 blur-xl" />
            <span className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-gradient-to-br from-[#14b8a6]/20 to-[#5b6cf6]/20 blur-xl" />
            <div className="relative">
              <div className="text-5xl mb-3">🎉</div>
              <p className="font-display text-2xl font-black leading-tight mb-2">
                No friend games yet.
              </p>
              <p className="font-body text-sm text-fg-muted mb-4 leading-snug">
                Add friends to see their plays here. Or start your own to break the ice.
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/game/select"><Button size="md" fullWidth>Start a game</Button></Link>
                <Link href="/friends/find"><Button variant="secondary" size="md" fullWidth>Find friends</Button></Link>
              </div>
            </div>
          </div>
        )}

        {/* Featured game cards */}
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Featured
        </p>
        <ul className="space-y-3">
          {featured.map((g) => (
            <li key={g.id}>
              <GameCard
                game={g}
                href={`/game/new?type=${g.id}&audience=friends`}
                meta={`${g.questions.length} questions · ~${Math.round(g.defaultDurationMs / 1000)}s`}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

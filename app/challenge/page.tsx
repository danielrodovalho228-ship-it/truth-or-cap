import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: "Today's challenge · Truth or Cap",
  description: 'A new prompt every day. Record your answer, see how the AI scores you.',
};

export const revalidate = 600; // 10 min

export default async function ChallengePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: challenge } = await supabase
    .from('daily_challenge')
    .select('challenge, active_date, created_at')
    .eq('active_date', today)
    .maybeSingle();

  const { data: qotd } = await supabase
    .from('question_of_day')
    .select('id, question, yes_count, no_count, active_date')
    .eq('active_date', today)
    .maybeSingle();

  const total = (qotd?.yes_count ?? 0) + (qotd?.no_count ?? 0);
  const yesPct = total > 0 ? Math.round(((qotd?.yes_count ?? 0) / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;

  return (
    <main className="min-h-screen flex flex-col pb-20">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">
          ← Home
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Today
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-6">
          What&apos;s on<br />
          <span className="italic font-light">trial today?</span>
        </h1>

        {/* QOTD card */}
        {qotd ? (
          <section className="border-2 border-fg p-5 mb-5">
            <p className="font-mono text-[10px] tracking-widest uppercase text-mustard mb-2">
              Question of the day
            </p>
            <p className="font-display text-xl leading-snug mb-4">&ldquo;{qotd.question}&rdquo;</p>

            <form action="/api/qotd/vote" method="POST" className="grid grid-cols-2 gap-2 mb-3">
              <input type="hidden" name="qotdId" value={qotd.id} />
              <button
                name="vote"
                value="yes"
                type="submit"
                className="border-2 border-acid text-acid font-display text-2xl font-black uppercase py-3 hover:bg-acid hover:text-bg transition-colors"
              >
                Yes
              </button>
              <button
                name="vote"
                value="no"
                type="submit"
                className="border-2 border-blood text-blood font-display text-2xl font-black uppercase py-3 hover:bg-blood hover:text-fg transition-colors"
              >
                No
              </button>
            </form>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono uppercase tracking-widest">
                <span className="text-acid">Yes · {qotd.yes_count ?? 0}</span>
                <span className="text-fg-muted">{yesPct}%</span>
              </div>
              <div className="h-1 bg-line">
                <div className="h-full bg-acid transition-all" style={{ width: `${yesPct}%` }} />
              </div>
              <div className="flex justify-between text-xs font-mono uppercase tracking-widest">
                <span className="text-blood">No · {qotd.no_count ?? 0}</span>
                <span className="text-fg-muted">{noPct}%</span>
              </div>
              <div className="h-1 bg-line">
                <div className="h-full bg-blood transition-all" style={{ width: `${noPct}%` }} />
              </div>
            </div>
          </section>
        ) : null}

        {/* Today's challenge */}
        {challenge ? (
          <section className="border-2 border-tape p-5 bg-bg-card mb-3">
            <p className="font-mono text-[10px] tracking-widest uppercase text-tape mb-2">
              Today&apos;s challenge
            </p>
            <p className="font-display text-xl leading-snug mb-4">&ldquo;{challenge.challenge}&rdquo;</p>
            <Link href={`/game/new?question=${encodeURIComponent(challenge.challenge)}`}>
              <Button size="lg" fullWidth>
                Record my answer →
              </Button>
            </Link>
          </section>
        ) : (
          <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
            No challenge for today yet — check back later.
          </p>
        )}
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

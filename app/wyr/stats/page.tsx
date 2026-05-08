import type { Metadata } from 'next';
import Link from 'next/link';
import { GameBanner } from '@/components/layout/GameBanner';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { GAME_TYPES, getWyrPrompt } from '@/lib/game-types';

export const metadata: Metadata = {
  title: 'Most polarizing — Would You Rather · Truth or Cap',
  description:
    'The Would You Rather questions where the crowd is most divided — and the ones where everyone agreed.',
};

interface PolarizingRow {
  questionId: string;
  question: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
  total: number;
  pctA: number;
  pctB: number;
  splitDistance: number;
}

const MIN_VOTES = 10;
const MAX_PER_LIST = 10;

async function loadRows(rpcName: 'wyr_polarizing' | 'wyr_consensus'): Promise<PolarizingRow[]> {
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc(rpcName, {
      p_min_votes: MIN_VOTES,
      p_limit: MAX_PER_LIST,
    });
    if (error || !Array.isArray(data)) return [];
    return data.flatMap((row) => {
      const prompt = getWyrPrompt(row.question_id);
      if (!prompt) return [];
      const total = Number(row.total ?? 0);
      const votesA = Number(row.votes_a ?? 0);
      const votesB = Number(row.votes_b ?? 0);
      const pctA = total > 0 ? Math.round((votesA / total) * 1000) / 10 : 0;
      const pctB = total > 0 ? Math.round((votesB / total) * 1000) / 10 : 0;
      return [
        {
          questionId: prompt.id,
          question: prompt.question,
          optionA: prompt.optionA,
          optionB: prompt.optionB,
          votesA,
          votesB,
          total,
          pctA,
          pctB,
          splitDistance: Number(row.split_distance ?? 0),
        },
      ];
    });
  } catch {
    return [];
  }
}

export default async function WyrStatsPage() {
  const [polarizing, consensus] = await Promise.all([
    loadRows('wyr_polarizing'),
    loadRows('wyr_consensus'),
  ]);
  const theme = GAME_TYPES.would_you_rather.theme;

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
        <GameBanner variant="hero" theme={theme} title="WYR Stats" subtitle="Crowd splits" />

        <Link
          href="/wyr"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6"
        >
          ← Back to vote
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Live tallies · Updated every minute
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] tracking-tight mb-3">
          The crowd&apos;s<br />
          <span className="italic font-light">favorite battles.</span>
        </h1>
        <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-sm">
          Aggregate votes only — no personal data. Minimum {MIN_VOTES} votes per row to filter
          noise.
        </p>

        <Section
          eyebrow="MOST POLARIZING"
          title="Closest to 50/50"
          subtitle="The room would split clean down the middle."
          rows={polarizing}
          emptyCopy="Not enough votes yet to find a split. Be the one who tips it."
        />

        <div className="h-8" />

        <Section
          eyebrow="UNANIMOUS"
          title="Almost everyone agreed"
          subtitle="The lopsided takes the crowd actually shares."
          rows={consensus}
          emptyCopy="Once enough people vote we'll surface the consensus picks."
        />
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

interface SectionProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  rows: PolarizingRow[];
  emptyCopy: string;
}

function Section({ eyebrow, title, subtitle, rows, emptyCopy }: SectionProps) {
  return (
    <section>
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-2">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl font-black leading-tight mb-1">{title}</h2>
      <p className="font-body text-sm text-fg-muted mb-4">{subtitle}</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-fg/20 p-5 text-center bg-bg-card">
          <p className="font-body text-sm text-fg-muted">{emptyCopy}</p>
          <Link
            href="/wyr"
            className="inline-block mt-3 font-mono text-[10px] tracking-widest uppercase text-fg hover:text-mustard"
          >
            Go vote →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.questionId}
              className="rounded-2xl border-2 border-fg p-4 bg-bg-card"
            >
              <Link href={`/wyr?id=${encodeURIComponent(row.questionId)}`} className="block">
                <p className="font-display text-base leading-snug mb-3">
                  &ldquo;{row.question}&rdquo;
                </p>

                <SplitBar pctA={row.pctA} pctB={row.pctB} />

                <div className="flex items-center justify-between font-mono text-[10px] tracking-widest uppercase mt-2">
                  <span className="text-acid">A · {row.pctA.toFixed(0)}%</span>
                  <span className="text-fg-muted">{row.total.toLocaleString()} votes</span>
                  <span className="text-blood">{row.pctB.toFixed(0)}% · B</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 font-body text-xs text-fg-muted">
                  <span className="leading-snug">
                    <span className="font-mono text-[9px] text-acid mr-1">A</span>
                    {row.optionA}
                  </span>
                  <span className="leading-snug text-right">
                    <span className="font-mono text-[9px] text-blood mr-1">B</span>
                    {row.optionB}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SplitBar({ pctA, pctB }: { pctA: number; pctB: number }) {
  return (
    <div
      className="relative h-3 rounded-full overflow-hidden border border-fg/10 bg-bg"
      role="img"
      aria-label={`A ${pctA.toFixed(0)}%, B ${pctB.toFixed(0)}%`}
    >
      <div className="absolute inset-y-0 left-0 bg-acid" style={{ width: `${pctA}%` }} />
      <div className="absolute inset-y-0 right-0 bg-blood" style={{ width: `${pctB}%` }} />
    </div>
  );
}

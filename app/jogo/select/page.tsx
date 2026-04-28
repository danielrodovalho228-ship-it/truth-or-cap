import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guard';
import { ALL_GAME_TYPES, type Audience } from '@/lib/game-types';

export const metadata: Metadata = {
  title: 'Pick a game · Truth or Cap',
  description: 'Choose a game mode and start playing.',
  robots: { index: false },
};

const AUDIENCES: Array<{ id: Audience; label: string; tagline: string }> = [
  { id: 'family', label: 'Family', tagline: 'PG. Kids welcome.' },
  { id: 'friends', label: 'Friends', tagline: 'Group nights. Default.' },
  { id: 'couples', label: 'Couples', tagline: 'Date-night honesty.' },
];

export default async function SelectGamePage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  await requireUser('/jogo/select');
  const params = await searchParams;
  const selected = (params.audience as Audience | undefined) ?? 'friends';

  const visibleTypes = ALL_GAME_TYPES.filter((t) => t.audience.includes(selected));

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
        <Link
          href="/"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6"
        >
          ← truthorcap
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          Pick a mode
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] tracking-tight mb-3">
          Who&apos;s<br />
          <span className="italic font-light">playing?</span>
        </h1>
        <p className="font-body text-base text-fg-muted leading-relaxed mb-8 max-w-sm">
          Filter games by audience. We tone questions accordingly — family stays PG, couples gets
          honest, friends gets spicy.
        </p>

        {/* Audience filter */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {AUDIENCES.map((a) => (
            <Link
              key={a.id}
              href={`/jogo/select?audience=${a.id}`}
              className={`border-2 py-3 px-2 text-center transition-colors ${
                selected === a.id
                  ? 'border-fg bg-fg text-bg'
                  : 'border-line text-fg hover:border-fg'
              }`}
            >
              <p className="font-display text-base font-black uppercase tracking-tight">{a.label}</p>
              <p className="font-mono text-[9px] tracking-widest uppercase mt-0.5 opacity-70">
                {a.tagline}
              </p>
            </Link>
          ))}
        </div>

        {/* Game cards */}
        <ul className="space-y-3">
          {visibleTypes.map((t) => (
            <li key={t.id}>
              <Link
                href={`/jogo/novo?type=${t.id}&audience=${selected}`}
                className="block border-2 border-line hover:border-fg p-5 transition-colors"
              >
                <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-2">
                  {t.questions.length} questions · ~{Math.round(t.defaultDurationMs / 1000)}s
                </p>
                <p className="font-display text-2xl font-black leading-tight mb-1">{t.label}</p>
                <p className="font-body text-sm text-fg-muted leading-snug">{t.tagline}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

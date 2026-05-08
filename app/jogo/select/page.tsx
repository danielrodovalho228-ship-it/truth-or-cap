import Link from 'next/link';
import type { Metadata } from 'next';
import { Radio } from 'lucide-react';
import { GameBanner } from '@/components/layout/GameBanner';
import { GameCard } from '@/components/layout/GameCard';
import { requireUser } from '@/lib/auth/guard';
import { ALL_GAME_TYPES, type Audience } from '@/lib/game-types';
import { getLang } from '@/lib/i18n/server';
import { t } from '@/lib/i18n/messages';

export const metadata: Metadata = {
  title: 'Pick a game · Truth or Cap',
  description: 'Choose a game mode and start playing.',
  robots: { index: false },
};

const AUDIENCE_EMOJI: Record<Audience, string> = {
  family: '👨‍👩‍👧',
  friends: '🥳',
  couples: '💞',
};

export default async function SelectGamePage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  await requireUser('/jogo/select');
  const params = await searchParams;
  const lang = await getLang();
  const selected = (params.audience as Audience | undefined) ?? 'friends';

  const AUDIENCES: Array<{ id: Audience; label: string; tagline: string; emoji: string }> = [
    { id: 'family',  label: t(lang, 'select.audience.family'),  tagline: t(lang, 'select.audience.family.tag'),  emoji: AUDIENCE_EMOJI.family },
    { id: 'friends', label: t(lang, 'select.audience.friends'), tagline: t(lang, 'select.audience.friends.tag'), emoji: AUDIENCE_EMOJI.friends },
    { id: 'couples', label: t(lang, 'select.audience.couples'), tagline: t(lang, 'select.audience.couples.tag'), emoji: AUDIENCE_EMOJI.couples },
  ];

  const visibleTypes = ALL_GAME_TYPES.filter((gt) => gt.audience.includes(selected));

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 flex flex-col px-6 py-6 max-w-md mx-auto w-full">
        <GameBanner variant="hero" subtitle="Pick your game" />

        <Link
          href="/"
          className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6"
        >
          {t(lang, 'feed.back')}
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">
          {t(lang, 'select.label')}
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] tracking-tight mb-3">
          {t(lang, 'select.title.line1')}<br />
          <span className="italic font-light">{t(lang, 'select.title.line2')}</span>
        </h1>
        <p className="font-body text-base text-fg-muted leading-relaxed mb-6 max-w-sm">
          {t(lang, 'select.subtitle')}
        </p>

        {/* Audience filter — vibrant chips */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {AUDIENCES.map((a) => (
            <Link
              key={a.id}
              href={`/jogo/select?audience=${a.id}`}
              className={`relative overflow-hidden rounded-2xl border-2 py-3 px-2 text-center transition-all ${
                selected === a.id
                  ? 'border-fg bg-fg text-bg shadow-md'
                  : 'border-line bg-bg-card text-fg hover:border-fg'
              }`}
            >
              <span className="block text-2xl mb-0.5" aria-hidden="true">{a.emoji}</span>
              <p className="font-display text-sm font-black uppercase tracking-tight">{a.label}</p>
              <p className="font-mono text-[9px] tracking-widest uppercase mt-0.5 opacity-70">
                {a.tagline}
              </p>
            </Link>
          ))}
        </div>

        {/* Live multiplayer */}
        <Link
          href="/online"
          className="relative block overflow-hidden rounded-2xl mb-4 shadow-sm group"
          style={{ backgroundImage: 'linear-gradient(135deg, #5b6cf6 0%, #14b8a6 100%)' }}
        >
          <span className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
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

        {/* Game cards */}
        <ul className="space-y-3">
          {visibleTypes.map((gt) => (
            <li key={gt.id}>
              <GameCard
                game={gt}
                href={`/jogo/novo?type=${gt.id}&audience=${selected}`}
                meta={`${gt.questions.length} ${t(lang, 'select.questionsSuffix')} · ${t(lang, 'select.typeToPlay')}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

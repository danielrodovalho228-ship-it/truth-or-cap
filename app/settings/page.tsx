import Link from 'next/link';
import type { Metadata } from 'next';
import { requireProfile } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { getLang } from '@/lib/i18n/server';
import { t } from '@/lib/i18n/messages';
import { fetchUserXp } from '@/lib/xp';
import { XpBar } from '@/components/layout/XpBar';
import { LanguageToggle } from './LanguageToggle';

export const metadata: Metadata = {
  title: 'Settings · Truth or Cap',
  robots: { index: false },
};

export default async function SettingsPage() {
  const { user, profile } = await requireProfile('/settings');
  const lang = await getLang();
  const supabase = await createClient();
  const xp = await fetchUserXp(supabase, user.id);

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">
          {t(lang, 'settings.back')}
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">{t(lang, 'settings.label')}</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-6">
          {t(lang, 'settings.title.line1')}<br />
          <span className="italic font-light">{t(lang, 'settings.title.line2')}</span>
        </h1>

        <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-violet-600/10 border-2 border-line">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-white font-display font-black text-xl shrink-0">
            {profile.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-lg truncate">@{profile.username}</p>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
              {lang === 'pt'
                ? `${profile.current_streak} dias de streak`
                : `${profile.current_streak}-day streak`}
            </p>
          </div>
          {(profile as { is_premium?: boolean }).is_premium ? (
            <span className="font-mono text-[10px] tracking-widest uppercase font-bold bg-mustard text-bg px-2 py-1 rounded">
              {t(lang, 'settings.premium')}
            </span>
          ) : null}
        </div>

        <XpBar
          totalXp={xp?.total_xp ?? 0}
          currentStreak={xp?.current_streak ?? profile.current_streak ?? 0}
          longestStreak={xp?.longest_streak ?? 0}
        />

        <Link
          href="/leaderboard"
          className="block border-2 border-line hover:border-fg p-3 mb-6 transition-colors rounded-xl"
        >
          <p className="font-display text-base font-black uppercase tracking-tight">
            {lang === 'pt' ? 'Ranking de amigos' : 'Friends leaderboard'}
          </p>
          <p className="font-mono text-[10px] tracking-widest uppercase opacity-70 mt-0.5">
            {lang === 'pt' ? 'Veja quem está na frente' : 'See who outranks the rest'}
          </p>
        </Link>

        <div className="space-y-3 mb-8">
          <Row label={t(lang, 'settings.row.username')} value={`@${profile.username}`} />
          <Row label={t(lang, 'settings.row.email')} value={user.email ?? '—'} />
        </div>

        <div className="mb-4">
          <LanguageToggle initial={lang} title={t(lang, 'settings.lang.title')} subtitle={t(lang, 'settings.lang.subtitle')} />
        </div>

        <div className="space-y-2">
          <SettingsLink
            href="/settings/privacy"
            title={t(lang, 'settings.privacy.title')}
            subtitle={t(lang, 'settings.privacy.subtitle')}
          />
          <SettingsLink
            href="/settings/notifications"
            title={t(lang, 'settings.notifications.title')}
            subtitle={t(lang, 'settings.notifications.subtitle')}
          />
          <SettingsLink
            href="/settings/delete"
            title={t(lang, 'settings.delete.title')}
            subtitle={t(lang, 'settings.delete.subtitle')}
            tone="warn"
          />
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="block w-full text-left border-2 border-line hover:border-fg p-3 transition-colors"
            >
              <p className="font-display text-base font-black uppercase tracking-tight">{t(lang, 'settings.signout.title')}</p>
              <p className="font-mono text-[10px] tracking-widest uppercase opacity-70 mt-0.5">{t(lang, 'settings.signout.subtitle')}</p>
            </button>
          </form>
        </div>

        <div className="mt-10 pt-6 border-t-2 border-line">
          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-2">{t(lang, 'settings.legal')}</p>
          <div className="flex flex-wrap gap-3 font-mono text-[10px] tracking-widest uppercase">
            <Link href="/terms" className="text-fg-muted hover:text-fg">{t(lang, 'settings.legal.terms')}</Link>
            <Link href="/privacy" className="text-fg-muted hover:text-fg">{t(lang, 'settings.legal.privacy')}</Link>
            <Link href="/cookies" className="text-fg-muted hover:text-fg">{t(lang, 'settings.legal.cookies')}</Link>
          </div>
        </div>
      </div>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-line p-3 flex items-baseline justify-between">
      <span className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">{label}</span>
      <span className="font-display text-base text-fg truncate ml-2 max-w-[60%]">{value}</span>
    </div>
  );
}

function SettingsLink({
  href,
  title,
  subtitle,
  tone,
}: {
  href: string;
  title: string;
  subtitle: string;
  tone?: 'warn';
}) {
  return (
    <Link
      href={href}
      className={`block border-2 p-3 transition-colors ${
        tone === 'warn' ? 'border-blood text-blood hover:bg-blood hover:text-fg' : 'border-line hover:border-fg'
      }`}
    >
      <p className="font-display text-base font-black uppercase tracking-tight">{title}</p>
      <p className="font-mono text-[10px] tracking-widest uppercase opacity-70 mt-0.5">{subtitle}</p>
    </Link>
  );
}

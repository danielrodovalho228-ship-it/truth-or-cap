import Link from 'next/link';
import type { Metadata } from 'next';
import { requireProfile } from '@/lib/auth/guard';

export const metadata: Metadata = {
  title: 'Settings · Truth or Cap',
  robots: { index: false },
};

export default async function SettingsPage() {
  const { user, profile } = await requireProfile('/settings');

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">
          ← Home
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">Settings</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-6">
          Your<br />
          <span className="italic font-light">controls.</span>
        </h1>

        <div className="space-y-3 mb-8">
          <Row label="Username" value={`@${profile.username}`} />
          <Row label="Email" value={user.email ?? '—'} />
          <Row label="Streak" value={`${profile.current_streak} days`} />
        </div>

        <div className="space-y-2">
          <SettingsLink href="/settings/privacy" title="Privacy" subtitle="Public profile, contacts, data" />
          <SettingsLink href="/settings/notifications" title="Notifications" subtitle="Push prefs (coming soon)" />
          <SettingsLink href="/settings/delete" title="Delete account" subtitle="Cascade delete + LGPD/GDPR" tone="warn" />
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="block w-full text-left border-2 border-line hover:border-fg p-3 transition-colors"
            >
              <p className="font-display text-base font-black uppercase tracking-tight">Sign out</p>
              <p className="font-mono text-[10px] tracking-widest uppercase opacity-70 mt-0.5">Clear session</p>
            </button>
          </form>
        </div>

        <div className="mt-10 pt-6 border-t-2 border-line">
          <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-2">Legal</p>
          <div className="flex flex-wrap gap-3 font-mono text-[10px] tracking-widest uppercase">
            <Link href="/terms" className="text-fg-muted hover:text-fg">Terms</Link>
            <Link href="/privacy" className="text-fg-muted hover:text-fg">Privacy</Link>
            <Link href="/cookies" className="text-fg-muted hover:text-fg">Cookies</Link>
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

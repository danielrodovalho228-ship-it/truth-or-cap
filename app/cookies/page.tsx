import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy · Truth or Cap',
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <article className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">← Home</Link>
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">Legal</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-2">Cookies</h1>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-8">
          We keep this tiny.
        </p>

        <section className="mb-8 font-body text-base text-fg-muted leading-relaxed space-y-3">
          <p>We use a few essential cookies to keep you logged in (Supabase auth) and to track which
            games you&apos;ve already voted on so you can&apos;t double-vote.</p>
          <p>We do <strong className="text-fg">not</strong> use ad-tracking or third-party marketing cookies. PostHog runs
            with privacy-mode enabled and only fires after sign-up.</p>
          <p>You can clear cookies anytime via your browser settings. That signs you out and resets
            your vote history client-side, but server-side records persist until you delete your account.</p>
        </section>
      </article>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

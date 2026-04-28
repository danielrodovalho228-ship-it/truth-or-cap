import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy · Truth or Cap',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <article className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">← Home</Link>
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">Legal</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-2">Privacy Policy</h1>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-8">
          Effective: 2026 · ⚠️ Lawyer review required before public launch
        </p>

        <Section title="What we collect">
          <ul>
            <li><strong>Account info:</strong> email, username, optional avatar.</li>
            <li><strong>Recordings:</strong> short voice + video clips you submit.</li>
            <li><strong>Voice baseline:</strong> 15-second neutral sample, used only to personalize the detector.</li>
            <li><strong>Contacts:</strong> only SHA-256 hashes of phone numbers, never raw numbers.</li>
            <li><strong>Usage data:</strong> events that drive product improvement (PostHog).</li>
          </ul>
        </Section>

        <Section title="Why we collect it">
          <p>To run the game, surface friends, analyze voice/face signals for entertainment, and improve the product.</p>
        </Section>

        <Section title="Retention">
          <ul>
            <li>Recordings: 7 days then deleted.</li>
            <li>Voice baseline: until you delete your account.</li>
            <li>Account data: until you delete your account.</li>
          </ul>
        </Section>

        <Section title="Third parties">
          <p>We send recordings to:
            <a href="https://hume.ai/security" className="underline ml-1">Hume AI</a>,
            <a href="https://openai.com/policies/privacy-policy" className="underline ml-1">OpenAI</a>,
            <a href="https://www.anthropic.com/privacy" className="underline ml-1">Anthropic</a>.
            Storage + auth via <a href="https://supabase.com/privacy" className="underline">Supabase</a>.
          </p>
        </Section>

        <Section title="Your rights (LGPD / GDPR)">
          <p>Access, rectify, delete, port your data anytime via <Link href="/settings" className="underline">Settings</Link>.
            Contact privacy@truthorcapapp.com for anything else (TODO: set up).</p>
        </Section>
      </article>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-2xl font-black mb-3">{title}</h2>
      <div className="font-body text-base text-fg-muted leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

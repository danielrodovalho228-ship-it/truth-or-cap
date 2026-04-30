import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service · Truth or Cap',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <article className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full prose prose-invert">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block no-underline">
          ← Home
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">Legal</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-2">Terms of Service</h1>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-8">
          Effective: 2026
        </p>

        <Section title="1. The service">
          <p>Truth or Cap is a social entertainment app. AI analyzes voice and facial signals from
            user-recorded clips and outputs a “SUS LEVEL” score. The score is a game element with
            <strong> no scientific or legal validity</strong>. It is not a lie detector.</p>
        </Section>

        <Section title="2. Acceptable use">
          <ul>
            <li>Record only yourself or people who have given consent.</li>
            <li>No harassment, bullying, hate speech, or content involving minors in compromising scenarios.</li>
            <li>No illegal content. We comply with takedown requests.</li>
            <li>You must be 13+ (or have parental consent in your jurisdiction).</li>
          </ul>
        </Section>

        <Section title="3. Your content">
          <p>You retain ownership of your recordings. You grant us a license to host, process via
            third-party AI providers (Hume, OpenAI, Anthropic), and display them per your privacy
            settings. Recordings auto-delete after 7 days.</p>
        </Section>

        <Section title="4. Account termination">
          <p>You can delete your account at any time in <Link href="/settings/delete" className="underline">Settings</Link>.
            We may suspend accounts that violate these terms.</p>
        </Section>

        <Section title="5. Limitation of liability">
          <p>To the maximum extent permitted by law, Truth or Cap is provided “as is.” We are not
            liable for any decision made or relationship damaged based on a SUS LEVEL score. It is
            for entertainment.</p>
        </Section>

        <Section title="6. Changes">
          <p>We may update these terms. Material changes will be announced to active users.</p>
        </Section>

        <Section title="7. Governing law">
          <p>[Jurisdiction TBD — finalize before launch].</p>
        </Section>

        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mt-12">
          Questions? legal@truthorcapapp.com (TODO: set up real address)
        </p>
      </article>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-2xl font-black mb-3">{title}</h2>
      <div className="font-body text-base text-fg-muted leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

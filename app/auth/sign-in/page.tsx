import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';
import { PasswordForm } from '@/components/auth/PasswordForm';

export const metadata: Metadata = {
  title: 'Sign in · Truth or Cap',
  description: 'Sign in to Truth or Cap with a magic link.',
  robots: { index: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === 'password' ? 'password' : 'magic';
  const next = params.next && params.next.startsWith('/') ? params.next : '/';
  const errorMsg = params.error;

  const otherHref =
    mode === 'magic'
      ? `/auth/sign-in?mode=password${next !== '/' ? `&next=${encodeURIComponent(next)}` : ''}`
      : `/auth/sign-in${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;
  const otherLabel = mode === 'magic' ? 'Use password instead' : 'Use magic link instead';

  const subtitle =
    mode === 'magic'
      ? "Drop your email. We’ll send a magic link — clicking it logs you in."
      : 'Email and password. Same account either way.';

  return (
    <AuthCard
      step="WELCOME BACK"
      title={
        <>
          Pick up<br />
          <span className="italic font-light">where you left.</span>
        </>
      }
      subtitle={subtitle}
      footer={
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center">
          New here?{' '}
          <Link href="/auth/sign-up" className="text-fg underline underline-offset-4 hover:text-mustard">
            Create account
          </Link>
        </p>
      }
    >
      {errorMsg ? (
        <p
          role="alert"
          className="font-mono text-xs uppercase tracking-widest text-blood border-2 border-blood px-3 py-2"
        >
          {decodeURIComponent(errorMsg)}
        </p>
      ) : null}

      {mode === 'magic' ? <MagicLinkForm mode="sign-in" next={next} /> : <PasswordForm mode="sign-in" next={next} />}

      <p className="text-center">
        <Link
          href={otherHref}
          className="font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg underline underline-offset-4"
        >
          {otherLabel}
        </Link>
      </p>
    </AuthCard>
  );
}

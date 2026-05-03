import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';
import { PasswordForm } from '@/components/auth/PasswordForm';
import { getLang } from '@/lib/i18n/server';
import { t } from '@/lib/i18n/messages';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Truth or Cap with a magic link.',
  robots: { index: false },
};

const ERROR_TEXT: Record<string, string> = {
  expired: 'Link expired or already used',
  missing: 'Missing auth code',
  generic: 'Could not sign you in',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const lang = await getLang();
  const mode = params.mode === 'password' ? 'password' : 'magic';
  const next =
    params.next && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/';
  const errorMsg = params.error ? ERROR_TEXT[params.error] ?? null : null;

  const otherHref =
    mode === 'magic'
      ? '/auth/sign-in?mode=password' + (next !== '/' ? '&next=' + encodeURIComponent(next) : '')
      : '/auth/sign-in' + (next !== '/' ? '?next=' + encodeURIComponent(next) : '');
  const otherLabel = mode === 'magic' ? t(lang, 'auth.cta.usePassword') : t(lang, 'auth.cta.useMagicLink');

  return (
    <AuthCard
      step="WELCOME BACK"
      title={
        <>
          {t(lang, 'auth.signin.title.line1')}<br />
          <span className="italic font-light">{t(lang, 'auth.signin.title.line2')}</span>
        </>
      }
      subtitle={t(lang, 'auth.signin.subtitle')}
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
          {errorMsg}
        </p>
      ) : null}

      {mode === 'magic' ? <MagicLinkForm mode="sign-in" next={next} /> : <PasswordForm mode="sign-in" />}

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

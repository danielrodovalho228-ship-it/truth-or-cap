import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';
import { PasswordForm } from '@/components/auth/PasswordForm';
import { ModeToggle } from './ModeToggle';
import { getLang } from '@/lib/i18n/server';
import { t } from '@/lib/i18n/messages';

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create an account to record your first lie detector game.',
  robots: { index: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const lang = await getLang();
  const mode = params.mode === 'password' ? 'password' : 'magic';

  return (
    <AuthCard
      step="STEP 01 - IDENTIFICATION"
      title={
        <>
          {t(lang, 'auth.signup.title.line1')}<br />
          <span className="italic font-light">{t(lang, 'auth.signup.title.line2')}</span>
        </>
      }
      subtitle="Your @username is how friends find you. Email gets a magic link - no password unless you want one."
      footer={
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center">
          Have an account?{' '}
          <Link href="/auth/sign-in" className="text-fg underline underline-offset-4 hover:text-mustard">
            Sign in
          </Link>
        </p>
      }
    >
      {mode === 'magic' ? <MagicLinkForm mode="sign-up" /> : <PasswordForm mode="sign-up" />}
      <ModeToggle current={mode} />
    </AuthCard>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password . Truth or Cap',
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      step="FORGOT?"
      title={<>No biggie<br /><span className="italic font-light">we got you.</span></>}
      subtitle="Drop your email — we'll send a link to set a new password."
      footer={
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted text-center">
          Remembered it?{' '}
          <Link href="/auth/sign-in?mode=password" className="text-fg underline underline-offset-4 hover:text-mustard">
            Sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}

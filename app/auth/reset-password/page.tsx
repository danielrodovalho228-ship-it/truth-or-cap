import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'New password . Truth or Cap',
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      step="NEW PASSWORD"
      title={<>Pick a new one<br /><span className="italic font-light">you'll remember.</span></>}
      subtitle="Minimum 8 characters. After this, you'll be signed in."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}

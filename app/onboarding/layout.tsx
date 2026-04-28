import { requireUser } from '@/lib/auth/guard';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/onboarding');
  return <OnboardingShell>{children}</OnboardingShell>;
}

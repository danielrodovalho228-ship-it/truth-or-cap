'use client';

import { useRouter } from 'next/navigation';
import { DemoDetector } from '@/components/onboarding/DemoDetector';

export function DemoClient() {
  const router = useRouter();
  return <DemoDetector onContinue={() => router.push('/onboarding/permissions')} />;
}

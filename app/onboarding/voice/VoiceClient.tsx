'use client';

import { useRouter } from 'next/navigation';
import { VoiceCalibrator } from '@/components/onboarding/VoiceCalibrator';

export function VoiceClient() {
  const router = useRouter();
  return <VoiceCalibrator onComplete={() => router.push('/onboarding/demo')} />;
}

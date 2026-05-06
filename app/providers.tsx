'use client';

import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { initAnalytics } from '@/lib/analytics';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

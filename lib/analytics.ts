// PostHog event tracking helpers. Falls back to console.debug when no key
// is configured (dev mode), so funnel calls are safe to scatter.

import posthog from 'posthog-js';

let initialized = false;

export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
  });
  initialized = true;
}

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[analytics:dev]', event, props ?? {});
    }
    return;
  }
  posthog.capture(event, props);
}

export function identifyUser(userId: string, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.identify(userId, props);
}

export function resetIdentity(): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.reset();
}

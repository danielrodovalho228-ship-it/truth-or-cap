import Stripe from 'stripe';

const SECRET = process.env.STRIPE_SECRET_KEY;

// Use SDK's default apiVersion to avoid type/runtime mismatches when the SDK
// is updated. Stripe pinning is best done via dependency upgrade, not
// hardcoded version strings here.
export const stripe = SECRET
  ? new Stripe(SECRET)
  : null;

export const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
export const STRIPE_PRICE_ID_MONTHLY =
  process.env.STRIPE_PRICE_ID_MONTHLY ?? process.env.STRIPE_PRICE_ID ?? '';
export const STRIPE_PRICE_ID_ANNUAL = process.env.STRIPE_PRICE_ID_ANNUAL ?? '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export type StripePlan = 'monthly' | 'annual';

export function priceIdFor(plan: StripePlan): string {
  return plan === 'annual' ? STRIPE_PRICE_ID_ANNUAL : STRIPE_PRICE_ID_MONTHLY;
}

export function isStripeConfigured(plan: StripePlan = 'monthly'): boolean {
  return !!(SECRET && priceIdFor(plan) && STRIPE_WEBHOOK_SECRET);
}

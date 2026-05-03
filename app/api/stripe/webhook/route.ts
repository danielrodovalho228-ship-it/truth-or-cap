import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Stripe webhooks need the raw body for signature verification.
export async function POST(req: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe/webhook] sig verify failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Idempotency: skip events already processed.
  const { error: insErr } = await admin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });
  if (insErr) {
    if ((insErr as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('[stripe/webhook] event log insert failed', insErr);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.supabase_user_id ?? null;
        const plan = (s.metadata?.plan as 'monthly' | 'annual' | undefined) ?? 'monthly';
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id ?? null;
        const subscriptionId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null;
        if (userId) {
          // Use a generous 35-day window for monthly, 400 for annual; webhooks
          // for subscription.updated will refine premium_until later.
          const days = plan === 'annual' ? 400 : 35;
          const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
          await admin
            .from('profiles')
            .update({
              is_premium: true,
              premium_until: until,
              premium_granted_at: new Date().toISOString(),
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq('id', userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const active = sub.status === 'active' || sub.status === 'trialing';
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
        const until = active && periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null;

        // Resolve userId in priority order:
        // 1) sub.metadata.supabase_user_id (set by checkout/route.ts when we
        //    created the subscription)
        // 2) profiles row matching stripe_customer_id (set by
        //    checkout.session.completed)
        // 3) stripe.customers.retrieve(customerId).metadata.supabase_user_id
        //    — covers webhook arriving BEFORE checkout.session.completed
        let userId = (sub.metadata?.supabase_user_id as string | undefined) ?? null;
        if (!userId) {
          const { data: existing } = await admin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
          userId = existing?.id ?? null;
        }
        if (!userId && stripe) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (!('deleted' in customer && customer.deleted)) {
              userId = (customer.metadata?.supabase_user_id as string | undefined) ?? null;
            }
          } catch (err) {
            console.error('[stripe/webhook] customers.retrieve failed', err);
          }
        }

        if (!userId) {
          console.warn('[stripe/webhook] subscription event without resolvable userId', sub.id, customerId);
          break;
        }

        // If subscription is no longer active but premium_until is still in
        // the future, keep is_premium=true and let the cron expire it when
        // period_end actually passes. Mirrors customer.subscription.deleted
        // logic to handle out-of-order webhook delivery.
        let nextPremium = active;
        let nextUntil = until;
        if (!active) {
          const { data: existing } = await admin
            .from('profiles')
            .select('premium_until')
            .eq('id', userId)
            .maybeSingle();
          const stillInWindow =
            existing?.premium_until && new Date(existing.premium_until) > new Date();
          if (stillInWindow) {
            nextPremium = true;
            nextUntil = existing!.premium_until;
          }
        }

        const { error } = await admin
          .from('profiles')
          .update({
            is_premium: nextPremium,
            premium_until: nextUntil,
            stripe_subscription_id: sub.id,
            stripe_customer_id: customerId,
          })
          .eq('id', userId);
        if (error) console.error('[stripe/webhook] sub update failed', error);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        // Honor premium_until: only revoke immediately if the paid period has
        // already lapsed. Otherwise leave is_premium=true and let the cron
        // (/api/cron/expire-lapsed-premium) flip it when premium_until passes.
        const { data: profile } = await admin
          .from('profiles')
          .select('id, premium_until')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        if (profile) {
          const until = profile.premium_until ? new Date(profile.premium_until).getTime() : 0;
          if (Date.now() > until) {
            await admin
              .from('profiles')
              .update({ is_premium: false, stripe_subscription_id: null })
              .eq('id', profile.id);
          } else {
            // Still inside paid window; clear sub id but keep premium flag.
            await admin
              .from('profiles')
              .update({ stripe_subscription_id: null })
              .eq('id', profile.id);
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        console.warn('[stripe/webhook] payment_failed for customer', customerId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error for', event.type, err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

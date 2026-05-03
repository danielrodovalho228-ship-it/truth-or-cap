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
        const userId = (sub.metadata?.supabase_user_id as string | undefined) ?? null;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const active = sub.status === 'active' || sub.status === 'trialing';
        // current_period_end is seconds since epoch
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
        const until = active && periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null;

        const updateBy = userId ? { id: userId } : { stripe_customer_id: customerId };
        const { error } = await admin
          .from('profiles')
          .update({
            is_premium: active,
            premium_until: until,
            stripe_subscription_id: sub.id,
            stripe_customer_id: customerId,
          })
          .match(updateBy);
        if (error) console.error('[stripe/webhook] sub update failed', error);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        await admin
          .from('profiles')
          .update({ is_premium: false, premium_until: null })
          .eq('stripe_customer_id', customerId);
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

import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { stripe, priceIdFor, isStripeConfigured, type StripePlan } from '@/lib/stripe';
import { rateLimit } from '@/lib/rate-limit';

const MIN_MS = 60 * 1000;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  let body: { plan?: StripePlan } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const plan: StripePlan = body.plan === 'annual' ? 'annual' : 'monthly';

  if (!isStripeConfigured(plan) || !stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const rl = rateLimit(`stripe:checkout:${user.id}`, 5, MIN_MS);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });
  }

  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, display_name')
    .eq('id', user.id)
    .maybeSingle();

  let customerId = (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;

  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: (profile as { display_name?: string } | null)?.display_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    } catch (err) {
      console.error('[stripe/checkout] create customer failed', err);
      return NextResponse.json({ error: 'Could not create customer' }, { status: 500 });
    }
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://truthorcapapp.com';
  const priceId = priceIdFor(plan);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/premium?success=1&plan=${plan}`,
      cancel_url: `${origin}/premium?canceled=1`,
      metadata: { supabase_user_id: user.id, plan },
    });
    return NextResponse.json({ url: session.url, plan });
  } catch (err) {
    console.error('[stripe/checkout] session create failed', err);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}

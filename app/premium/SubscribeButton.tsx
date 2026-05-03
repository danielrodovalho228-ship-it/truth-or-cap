'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  defaultPlan?: 'monthly' | 'annual';
}

export function SubscribeButton({ defaultPlan = 'monthly' }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<'monthly' | 'annual'>(defaultPlan);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleSubscribe() {
    setErr(null);
    start(async () => {
      try {
        const r = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        });
        if (r.status === 401) {
          router.push('/auth/sign-in?next=/premium');
          return;
        }
        const j = await r.json().catch(() => ({} as { url?: string; error?: string }));
        if (!r.ok || !j.url) {
          setErr(j.error || 'Could not start checkout. Try again.');
          return;
        }
        window.location.href = j.url;
      } catch {
        setErr('Network error. Try again.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Billing period" className="grid grid-cols-2 gap-3">
        <button
          type="button"
          role="radio"
          aria-checked={plan === 'monthly'}
          onClick={() => setPlan('monthly')}
          className={
            'rounded-2xl border-2 px-4 py-4 text-left transition ' +
            (plan === 'monthly'
              ? 'border-violet-600 bg-violet-50 shadow-[0_4px_0_#7c3aed]'
              : 'border-pink-200 bg-white hover:border-violet-300')
          }
        >
          <div className="text-xs font-mono uppercase tracking-widest text-violet-600">Monthly</div>
          <div className="font-display text-2xl font-black text-violet-900">$4.99</div>
          <div className="text-xs text-violet-700/80">per month</div>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={plan === 'annual'}
          onClick={() => setPlan('annual')}
          className={
            'rounded-2xl border-2 px-4 py-4 text-left transition relative ' +
            (plan === 'annual'
              ? 'border-pink-500 bg-pink-50 shadow-[0_4px_0_#ec4899]'
              : 'border-pink-200 bg-white hover:border-pink-300')
          }
        >
          <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
            Save 33%
          </span>
          <div className="text-xs font-mono uppercase tracking-widest text-pink-600">Annual</div>
          <div className="font-display text-2xl font-black text-violet-900">$39.99</div>
          <div className="text-xs text-violet-700/80">$3.33/mo · billed yearly</div>
        </button>
      </div>

      <button
        type="button"
        onClick={handleSubscribe}
        disabled={pending}
        className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold py-4 text-lg shadow-[0_6px_0_#7c3aed] active:translate-y-1 active:shadow-[0_2px_0_#7c3aed] transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Redirecting…' : `Get Premium · ${plan === 'annual' ? '$39.99/yr' : '$4.99/mo'}`}
      </button>

      {err && (
        <p role="alert" className="text-sm text-red-600 text-center">
          {err}
        </p>
      )}

      <p className="text-[11px] text-center text-violet-700/60">
        Secure checkout via Stripe · cancel anytime · no questions asked
      </p>
    </div>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { SubscribeButton } from './SubscribeButton';

export const metadata: Metadata = {
  title: 'Premium',
  description: 'Unlock spicy questions, advanced stats and the gold cap.',
};

interface Props {
  searchParams?: Promise<{ success?: string; canceled?: string; plan?: string }>;
}

export default async function PremiumPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const success = sp.success === '1';
  const canceled = sp.canceled === '1';
  const planFromUrl = sp.plan === 'annual' ? 'annual' : 'monthly';

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-violet-50 px-5 py-12 pb-32">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-7xl mb-3 leading-none">💎</div>
          <h1 className="font-display text-4xl font-black text-violet-900 leading-tight tracking-tight">
            Truth or Cap<br />
            <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent italic font-light">
              Premium
            </span>
          </h1>
          <p className="font-body text-violet-700/80 mt-3">
            Cancel anytime · 7-day refund window
          </p>
        </div>

        {success && (
          <div role="status" className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 mb-6 text-center">
            <div className="text-3xl mb-1">🎉</div>
            <div className="font-bold text-emerald-900">Welcome to Premium!</div>
            <p className="text-sm text-emerald-800 mt-1">
              Your {planFromUrl === 'annual' ? 'annual' : 'monthly'} plan is active. Spicy unlocked.
            </p>
            <Link href="/home" className="inline-block mt-3 text-violet-700 underline font-mono text-xs uppercase tracking-widest">
              Back to app →
            </Link>
          </div>
        )}

        {canceled && (
          <div role="status" className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-6 text-center">
            <div className="text-2xl mb-1">🤷</div>
            <div className="font-bold text-amber-900">No worries.</div>
            <p className="text-sm text-amber-800 mt-1">
              You can subscribe whenever you want. Mild pack stays free forever.
            </p>
          </div>
        )}

        <div className="bg-white border-2 border-pink-200 rounded-3xl p-6 mb-6 shadow-[0_6px_0_#9d3bff]">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-2xl leading-none">🌶️</span>
              <div>
                <div className="font-bold text-violet-900">Spicy pack</div>
                <div className="text-sm text-violet-700/70">Adult-only questions, only for the bold</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl leading-none">📈</span>
              <div>
                <div className="font-bold text-violet-900">Unlimited history</div>
                <div className="text-sm text-violet-700/70">Every round saved forever</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl leading-none">🧠</span>
              <div>
                <div className="font-bold text-violet-900">Advanced detector</div>
                <div className="text-sm text-violet-700/70">Voice + face + language with extra precision</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl leading-none">👑</span>
              <div>
                <div className="font-bold text-violet-900">Gold cap badge</div>
                <div className="text-sm text-violet-700/70">Profile flair + leaderboard highlight</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl leading-none">🚫</span>
              <div>
                <div className="font-bold text-violet-900">No ads, ever</div>
                <div className="text-sm text-violet-700/70">Forever, in every mode</div>
              </div>
            </li>
          </ul>
        </div>

        {!success && <SubscribeButton defaultPlan={planFromUrl} />}

        <div className="text-center mt-8">
          <Link href="/home" className="font-mono text-xs uppercase tracking-widest text-violet-700/60 underline">
            ← Maybe later
          </Link>
        </div>
      </div>
    </main>
  );
}

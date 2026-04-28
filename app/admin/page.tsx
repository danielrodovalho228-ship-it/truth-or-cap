import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Admin · Truth or Cap',
  robots: { index: false },
};

export default async function AdminPage() {
  const admin = createServiceRoleClient();

  const [{ count: userCount }, { count: gameCount }, { count: voteCount }, costData] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('games').select('*', { count: 'exact', head: true }),
    admin.from('votes').select('*', { count: 'exact', head: true }),
    admin.rpc('total_cost_in_window', { window_hours: 24 }),
  ]);

  const totalCost = (costData.data as number | null) ?? 0;

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">
          ← Home
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">Admin</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-8">
          Numbers that<br />
          <span className="italic font-light">matter.</span>
        </h1>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Stat label="Users" value={userCount ?? 0} />
          <Stat label="Games" value={gameCount ?? 0} />
          <Stat label="Votes" value={voteCount ?? 0} />
          <Stat label="Cost 24h" value={`$${totalCost.toFixed(2)}`} tone={totalCost > 50 ? 'warn' : 'ok'} />
        </div>

        <div className="space-y-2">
          <Link href="/admin/costs" className="block border-2 border-line hover:border-fg p-4">
            <p className="font-mono text-[10px] tracking-widest uppercase text-mustard mb-1">Costs</p>
            <p className="font-display text-lg">API spend by provider</p>
          </Link>
          {/* /admin/games + /admin/funnel deferred — manage games via Supabase
              SQL Editor for v1, full moderation UI in M10 polish backlog. */}
        </div>
      </div>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'warn' | 'ok' }) {
  return (
    <div className="border-2 border-line p-4">
      <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mb-1">{label}</p>
      <p className={`font-display text-3xl font-black ${tone === 'warn' ? 'text-blood' : 'text-fg'}`}>
        {value}
      </p>
    </div>
  );
}

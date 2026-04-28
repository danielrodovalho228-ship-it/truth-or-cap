import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/server';

export default async function AdminCostsPage() {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from('api_cost_log')
    .select('provider, cost_usd, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const byProvider = (data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.provider] = (acc[row.provider] ?? 0) + Number(row.cost_usd);
    return acc;
  }, {});

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link href="/admin" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">
          ← Admin
        </Link>
        <h1 className="font-display text-4xl font-black leading-[0.9] mb-6">Costs by provider</h1>
        <ul className="space-y-2 mb-6">
          {Object.entries(byProvider).map(([provider, total]) => (
            <li key={provider} className="border-2 border-line p-3 flex items-baseline justify-between">
              <span className="font-mono text-[10px] tracking-widest uppercase text-mustard">{provider}</span>
              <span className="font-display text-2xl font-black">${total.toFixed(4)}</span>
            </li>
          ))}
          {Object.keys(byProvider).length === 0 && (
            <li className="font-mono text-xs text-fg-muted">No cost rows yet.</li>
          )}
        </ul>
        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
          Showing last 100 entries
        </p>
      </div>
      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

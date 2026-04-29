import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Admin · Truth or Cap',
  robots: { index: false },
};

export default async function AdminPage() {
  const admin = createServiceRoleClient();
  const { data: summary, error } = await admin.rpc('admin_summary');
  const s = (summary as Array<Record<string, number>> | null)?.[0] ?? {
    total_users: 0,
    allowed_users: 0,
    admin_users: 0,
    total_rooms: 0,
    active_rooms: 0,
    total_rounds: 0,
    analyzed_rounds: 0,
    cost_24h: 0,
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-display font-black text-violet-900 mb-2">Dashboard</h1>
      <p className="text-violet-700/80 mb-6 text-sm">Pulse of the app — refresh on demand.</p>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Users" value={Number(s.total_users)} />
        <Stat label="Allowed" value={Number(s.allowed_users)} />
        <Stat label="Admins" value={Number(s.admin_users)} />
        <Stat label="Rooms total" value={Number(s.total_rooms)} />
        <Stat label="Rooms active" value={Number(s.active_rooms)} tone={Number(s.active_rooms) > 0 ? 'good' : 'mute'} />
        <Stat label="Rounds total" value={Number(s.total_rounds)} />
        <Stat label="Rounds analyzed" value={Number(s.analyzed_rounds)} />
        <Stat label="Cost 24h" value={`$${Number(s.cost_24h).toFixed(2)}`} tone={Number(s.cost_24h) > 50 ? 'warn' : 'good'} />
      </section>

      {error ? (
        <p className="px-4 py-3 rounded-2xl bg-rose-100 text-rose-800 text-sm mb-6">RPC error: {error.message}</p>
      ) : null}

      <section className="grid md:grid-cols-2 gap-3">
        <Link href="/admin/users" className="block rounded-2xl border-2 border-pink-200 hover:border-violet-500 p-5 bg-white">
          <p className="font-mono text-xs uppercase tracking-widest text-violet-700/70 mb-1">Manage</p>
          <p className="font-display text-xl font-bold text-violet-900">Users</p>
          <p className="text-sm text-violet-700/80 mt-1">Grant/revoke access, promote admins.</p>
        </Link>
        <Link href="/admin/rooms" className="block rounded-2xl border-2 border-pink-200 hover:border-violet-500 p-5 bg-white">
          <p className="font-mono text-xs uppercase tracking-widest text-violet-700/70 mb-1">Live</p>
          <p className="font-display text-xl font-bold text-violet-900">Rooms</p>
          <p className="text-sm text-violet-700/80 mt-1">Active multiplayer rooms + recent rounds.</p>
        </Link>
        <Link href="/admin/costs" className="block rounded-2xl border-2 border-pink-200 hover:border-violet-500 p-5 bg-white">
          <p className="font-mono text-xs uppercase tracking-widest text-violet-700/70 mb-1">Spend</p>
          <p className="font-display text-xl font-bold text-violet-900">Costs</p>
          <p className="text-sm text-violet-700/80 mt-1">API spend by provider, top users.</p>
        </Link>
        <a href="https://supabase.com/dashboard/project/mldaoedudfdzmldbnqhi" target="_blank" rel="noopener noreferrer" className="block rounded-2xl border-2 border-pink-200 hover:border-violet-500 p-5 bg-white">
          <p className="font-mono text-xs uppercase tracking-widest text-violet-700/70 mb-1">External</p>
          <p className="font-display text-xl font-bold text-violet-900">Supabase ↗</p>
          <p className="text-sm text-violet-700/80 mt-1">SQL editor, table data, auth.</p>
        </a>
      </section>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'warn' | 'mute' }) {
  const color =
    tone === 'warn' ? 'text-rose-600' :
    tone === 'mute' ? 'text-violet-400' :
                      'text-violet-900';
  return (
    <div className="rounded-2xl bg-white border-2 border-pink-200 p-4">
      <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/70 mb-1">{label}</p>
      <p className={`font-display text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}

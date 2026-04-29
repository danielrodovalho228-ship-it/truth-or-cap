import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminRoomsPage() {
  const admin = createServiceRoleClient();
  const { data: rooms } = await admin
    .from('rooms')
    .select('id, code, mode, spice, status, current_round, max_rounds, max_players, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-display font-black text-violet-900 mb-2">Rooms</h1>
      <p className="text-violet-700/80 mb-6 text-sm">Last 50 rooms.</p>

      <div className="rounded-2xl border-2 border-pink-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 text-violet-900">
            <tr>
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Mode / Spice</th>
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-center px-3 py-2">Round</th>
              <th className="text-left px-3 py-2 hidden md:table-cell">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-100">
            {(rooms ?? []).map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-3 font-mono font-bold text-violet-900">
                  <Link href={`/room/${r.code}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {r.code}
                  </Link>
                </td>
                <td className="px-3 py-3 text-violet-700">{r.mode} · {r.spice}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                    r.status === 'playing' ? 'bg-emerald-100 text-emerald-800' :
                    r.status === 'finished' ? 'bg-violet-100 text-violet-700' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-violet-700">{r.current_round}/{r.max_rounds}</td>
                <td className="px-3 py-3 hidden md:table-cell text-violet-700/70 text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(rooms?.length ?? 0) === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-violet-700/60">No rooms yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

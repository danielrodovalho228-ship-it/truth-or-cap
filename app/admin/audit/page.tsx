import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Audit log',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export default async function AuditPage() {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (data ?? []) as AuditRow[];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60 mb-1">Compliance</p>
        <h1 className="font-display text-4xl font-black text-violet-900 leading-none">Audit log</h1>
        <p className="text-sm text-violet-700/80 mt-1">Last 100 admin actions, newest first.</p>
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-4 text-rose-900 text-sm mb-6">
          Couldn't load audit log: {error.message}
        </div>
      ) : null}

      <div className="rounded-2xl bg-white border-2 border-pink-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 border-b border-pink-200">
            <tr>
              <th className="text-left px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/70">When</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/70">Actor</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/70">Action</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/70">Target</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/70">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-violet-700/60">
                  No admin actions logged yet. Every grant/revoke/ban will appear here.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-pink-50/50">
                  <td className="px-4 py-3 font-mono text-[11px] text-violet-700/80 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-violet-900 truncate max-w-[180px]">
                    {row.actor_email ?? row.actor_id?.slice(0, 8) ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-violet-100 text-violet-900 font-mono text-[11px]">
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-violet-700/80 font-mono text-[11px]">
                    {row.target_type ? `${row.target_type}:${row.target_id?.slice(0, 8) ?? ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-violet-700/70 font-mono text-[10px] truncate max-w-[220px]">
                    {row.detail ? JSON.stringify(row.detail).slice(0, 80) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/40 mt-4 text-center">
        Audit log retains all admin grants/revokes/bans/Premium edits. Tamper-evident. RLS protected.
      </p>
    </div>
  );
}

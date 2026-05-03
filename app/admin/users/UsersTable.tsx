'use client';

import { useState, useTransition } from 'react';
import { Crown, ShieldCheck, ShieldOff } from 'lucide-react';

interface Row {
  id: string;
  username: string | null;
  email: string;
  is_admin: boolean;
  is_allowed: boolean;
  allowed_at: string | null;
  created_at: string;
}

export function UsersTable({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const toggle = (id: string, field: 'is_admin' | 'is_allowed') => {
    setError(null);
    const current = rows.find(r => r.id === id);
    if (!current) return;
    const next = !current[field];
    // Confirm destructive toggles only (granting access doesn't need a prompt).
    if (current[field] && typeof window !== 'undefined') {
      const who = current.email || current.username || current.id.slice(0, 8);
      const msg =
        field === 'is_admin'
          ? 'Demote ' + who + ' from admin?'
          : 'Revoke access for ' + who + '?';
      if (!window.confirm(msg)) return;
    }
    setRows((prev) => prev.map(r => r.id === id ? { ...r, [field]: next } : r));
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: id, [field]: next }),
        });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j.error ?? 'Update failed');
        }
      } catch (e) {
        // Revert on failure.
        setRows((prev) => prev.map(r => r.id === id ? { ...r, [field]: current[field] } : r));
        setError(e instanceof Error ? e.message : 'Update failed');
      }
    });
  };

  const filtered = rows.filter(r => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (r.email.toLowerCase().includes(q) || (r.username ?? '').toLowerCase().includes(q));
  });

  return (
    <>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by email or @username"
        className="w-full mb-4 px-4 py-3 rounded-2xl bg-white border-2 border-pink-200 focus:border-pink-500 outline-none text-violet-900 placeholder:text-violet-400"
      />
      {error ? <p className="mb-4 px-4 py-3 rounded-2xl bg-rose-100 text-rose-800 text-sm">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border-2 border-pink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 text-violet-900">
            <tr>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2 hidden md:table-cell">Joined</th>
              <th className="text-center px-3 py-2">Allowed</th>
              <th className="text-center px-3 py-2">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-100">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-3">
                  <div className="font-bold text-violet-900">{r.username ? `@${r.username}` : '—'}</div>
                  <div className="text-xs text-violet-700/70">{r.email || r.id.slice(0,8)}</div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell text-violet-700/80 text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => toggle(r.id, 'is_allowed')}
                    disabled={pending}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${r.is_allowed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
                    type="button"
                  >
                    {r.is_allowed ? <><ShieldCheck className="w-3.5 h-3.5" /> allowed</> : <><ShieldOff className="w-3.5 h-3.5" /> blocked</>}
                  </button>
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => toggle(r.id, 'is_admin')}
                    disabled={pending}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${r.is_admin ? 'bg-amber-100 text-amber-800' : 'bg-violet-50 text-violet-700'}`}
                    type="button"
                  >
                    <Crown className="w-3.5 h-3.5" /> {r.is_admin ? 'admin' : 'user'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-violet-700/60">No users match.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

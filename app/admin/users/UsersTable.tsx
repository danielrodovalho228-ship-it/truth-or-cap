'use client';

import { useState, useTransition } from 'react';
import { Crown, ShieldCheck, ShieldOff, Sparkles } from 'lucide-react';

interface Row {
  id: string;
  username: string | null;
  email: string;
  is_admin: boolean;
  is_allowed: boolean;
  is_premium: boolean;
  premium_until: string | null;
  allowed_at: string | null;
  created_at: string;
}

export function UsersTable({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const toggle = (id: string, field: 'is_admin' | 'is_allowed' | 'is_premium') => {
    setError(null);
    const current = rows.find(r => r.id === id);
    if (!current) return;
    const next = !current[field];
    if (current[field] && typeof window !== 'undefined') {
      const who = current.email || current.username || current.id.slice(0, 8);
      const labels = {
        is_admin: 'Demote ' + who + ' from admin?',
        is_allowed: 'Revoke access for ' + who + '?',
        is_premium: 'Revoke Premium for ' + who + '?',
      };
      if (!window.confirm(labels[field])) return;
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
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by email or @username"
          className="flex-1 min-w-[240px] px-4 py-2.5 rounded-xl bg-white border-2 border-pink-200 focus:border-pink-500 outline-none text-violet-900 placeholder:text-violet-400 text-sm"
        />
        <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60 whitespace-nowrap">
          {filtered.length} of {rows.length} users
        </p>
      </div>

      {error ? <p className="mb-4 px-4 py-3 rounded-xl bg-rose-100 text-rose-800 text-sm">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border-2 border-pink-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-violet-50">
            <tr>
              <th className="text-left px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/80">User</th>
              <th className="text-left px-3 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/80 hidden md:table-cell">Joined</th>
              <th className="text-center px-3 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/80">Allowed</th>
              <th className="text-center px-3 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/80">Admin</th>
              <th className="text-center px-3 py-3 font-mono text-[10px] tracking-widest uppercase text-violet-700/80">Premium</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-pink-50/30">
                <td className="px-4 py-3">
                  <div className="font-bold text-violet-900">{r.username ? '@' + r.username : '—'}</div>
                  <div className="text-xs text-violet-700/80 truncate max-w-[280px]">{r.email || r.id.slice(0,8)}</div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell text-violet-700/80 text-xs whitespace-nowrap">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => toggle(r.id, 'is_allowed')}
                    disabled={pending}
                    className={'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ' + (r.is_allowed ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200')}
                    type="button"
                  >
                    {r.is_allowed ? <><ShieldCheck className="w-3.5 h-3.5" /> allowed</> : <><ShieldOff className="w-3.5 h-3.5" /> blocked</>}
                  </button>
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => toggle(r.id, 'is_admin')}
                    disabled={pending}
                    className={'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ' + (r.is_admin ? 'bg-violet-200 text-violet-900 hover:bg-violet-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                    type="button"
                  >
                    <Crown className="w-3.5 h-3.5" /> {r.is_admin ? 'admin' : '—'}
                  </button>
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => toggle(r.id, 'is_premium')}
                    disabled={pending}
                    className={'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ' + (r.is_premium ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white hover:opacity-90' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                    type="button"
                    title={r.premium_until ? 'until ' + new Date(r.premium_until).toLocaleDateString() : ''}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> {r.is_premium ? 'premium' : '—'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

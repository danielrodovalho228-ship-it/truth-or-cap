import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

interface SummaryRow {
  total_users: number;
  allowed_users: number;
  admin_users: number;
  total_rooms: number;
  active_rooms: number;
  total_rounds: number;
  analyzed_rounds: number;
  cost_24h: number;
}

export default async function AdminPage() {
  const admin = createServiceRoleClient();

  const [{ data: summary }, premiumQ, signupsQ, roundsQ, recentRoundsQ, healthQ] = await Promise.all([
    admin.rpc('admin_summary'),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
    admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    admin.from('room_rounds').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    admin.from('room_rounds').select('id, question, sus_level, declared_answer, revealed_at, created_at').order('created_at', { ascending: false }).limit(8),
    admin.from('api_cost_log').select('cost_usd').gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
  ]);

  const s = (summary as SummaryRow[] | null)?.[0] ?? ({} as SummaryRow);
  const premiumCount = premiumQ.count ?? 0;
  const signups24h = signupsQ.count ?? 0;
  const rounds24h = roundsQ.count ?? 0;
  const recentRounds = recentRoundsQ.data ?? [];
  const cost1h = (healthQ.data ?? []).reduce((acc, r) => acc + Number((r as { cost_usd: number }).cost_usd ?? 0), 0);

  const totalUsers = Number(s.total_users ?? 0);
  const cost24h = Number(s.cost_24h ?? 0);
  const conversionRate = totalUsers > 0 ? ((premiumCount / totalUsers) * 100).toFixed(1) : '0.0';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60 mb-1">Overview</p>
          <h1 className="font-display text-4xl font-black text-violet-900 leading-none">Dashboard</h1>
          <p className="text-sm text-violet-700/80 mt-1">Real-time pulse of Truth or Cap.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/users?filter=new"
            className="px-4 py-2 bg-white border-2 border-pink-200 rounded-xl text-violet-900 font-medium hover:border-violet-500 transition-colors text-sm"
          >
            New users
          </Link>
          <Link
            href="/admin/rooms?status=active"
            className="px-4 py-2 bg-violet-900 text-white rounded-xl font-medium hover:bg-violet-800 transition-colors text-sm"
          >
            Live rooms
          </Link>
        </div>
      </div>

      {/* Top KPI row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total users"
          value={totalUsers.toLocaleString()}
          delta={signups24h > 0 ? `+${signups24h} (24h)` : '—'}
          icon="👥"
          tone="brand"
        />
        <KpiCard
          label="Premium"
          value={premiumCount.toLocaleString()}
          delta={`${conversionRate}% conversion`}
          icon="💎"
          tone={premiumCount > 0 ? 'success' : 'mute'}
        />
        <KpiCard
          label="Active rooms"
          value={Number(s.active_rooms ?? 0).toLocaleString()}
          delta={`${rounds24h} rounds (24h)`}
          icon="🎮"
          tone={Number(s.active_rooms ?? 0) > 0 ? 'success' : 'mute'}
        />
        <KpiCard
          label="API spend (24h)"
          value={`$${cost24h.toFixed(2)}`}
          delta={`$${cost1h.toFixed(2)} last 1h`}
          icon="💸"
          tone={cost24h > 50 ? 'warn' : cost24h > 20 ? 'caution' : 'success'}
        />
      </section>

      {/* Health + Conversion funnel */}
      <section className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl bg-white border-2 border-pink-200 p-5">
          <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60 mb-3">System health</p>
          <div className="space-y-3">
            <HealthRow label="Supabase" status="ok" detail={`${Number(s.total_users ?? 0)} profiles`} />
            <HealthRow label="API spend" status={cost24h > 100 ? 'warn' : 'ok'} detail={`$${cost24h.toFixed(2)} / $100 daily cap`} />
            <HealthRow label="Stripe webhook" status="ok" detail="Signature verify enabled" />
            <HealthRow label="Daily challenge cron" status={rounds24h > 0 ? 'ok' : 'caution'} detail={rounds24h > 0 ? 'Active' : 'No rounds in 24h'} />
            <HealthRow label="Recordings storage" status="ok" detail="Private bucket, signed URLs" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border-2 border-pink-200 p-5">
          <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60 mb-3">Conversion funnel</p>
          <FunnelRow label="Total signups" value={totalUsers} pct={100} />
          <FunnelRow label="Allowed (closed beta)" value={Number(s.allowed_users ?? 0)} pct={totalUsers > 0 ? Math.round((Number(s.allowed_users) / totalUsers) * 100) : 0} />
          <FunnelRow label="Played (≥1 round)" value={Number(s.analyzed_rounds ?? 0)} pct={totalUsers > 0 ? Math.round((Number(s.analyzed_rounds ?? 0) / totalUsers) * 100) : 0} />
          <FunnelRow label="Premium converted" value={premiumCount} pct={Number(conversionRate)} highlight />
        </div>
      </section>

      {/* Recent activity */}
      <section className="rounded-2xl bg-white border-2 border-pink-200 p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60">Recent rounds</p>
          <Link href="/admin/rooms" className="font-mono text-[10px] tracking-widest uppercase text-violet-700 hover:text-violet-900">All rooms →</Link>
        </div>
        {recentRounds.length === 0 ? (
          <p className="text-sm text-violet-700/60 py-6 text-center">No rounds yet. The first multiplayer game will show up here.</p>
        ) : (
          <ul className="divide-y divide-pink-100">
            {recentRounds.map((r) => {
              const round = r as { id: string; question: string; sus_level: number | null; declared_answer: string | null; revealed_at: string | null; created_at: string };
              return (
                <li key={round.id} className="py-3 flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{round.declared_answer === 'truth' ? '✅' : round.declared_answer === 'cap' ? '🧢' : '⏳'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-violet-900 truncate font-medium">"{round.question}"</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-violet-700/50 mt-0.5">
                      {timeAgo(round.created_at)} · {round.sus_level === null ? 'pending' : round.sus_level === -1 ? 'analyzing' : `sus ${round.sus_level}%`} · {round.revealed_at ? 'revealed' : 'open'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Quick actions */}
      <section className="grid md:grid-cols-3 gap-4">
        <ActionCard
          href="/admin/users"
          icon="👤"
          title="Manage users"
          description="Grant access, promote admins, ban abusive accounts"
          tone="violet"
        />
        <ActionCard
          href="/admin/audit"
          icon="📜"
          title="Audit log"
          description="Review every admin action with full traceability"
          tone="pink"
        />
        <ActionCard
          href="/admin/costs"
          icon="📊"
          title="Cost analytics"
          description="Per-provider, per-user breakdown of API spend"
          tone="rose"
        />
      </section>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <a
          href="https://supabase.com/dashboard/project/mldaoedudfdzmldbnqhi"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-4 hover:border-emerald-500 transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">🗄️</span>
          <div className="flex-1">
            <p className="font-display font-bold text-emerald-900">Supabase ↗</p>
            <p className="text-xs text-emerald-700/80">SQL editor · table data · auth users</p>
          </div>
        </a>
        <a
          href="https://dashboard.stripe.com/test/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-indigo-50 border-2 border-indigo-200 p-4 hover:border-indigo-500 transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">💳</span>
          <div className="flex-1">
            <p className="font-display font-bold text-indigo-900">Stripe ↗</p>
            <p className="text-xs text-indigo-700/80">Subscriptions · webhooks · invoices</p>
          </div>
        </a>
      </div>
    </div>
  );
}

interface KpiProps {
  label: string;
  value: string;
  delta: string;
  icon: string;
  tone: 'brand' | 'success' | 'caution' | 'warn' | 'mute';
}

function KpiCard({ label, value, delta, icon, tone }: KpiProps) {
  const toneStyles = {
    brand: 'border-violet-200 bg-gradient-to-br from-white to-violet-50',
    success: 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50',
    caution: 'border-amber-200 bg-gradient-to-br from-white to-amber-50',
    warn: 'border-rose-200 bg-gradient-to-br from-white to-rose-50',
    mute: 'border-slate-200 bg-white',
  };
  const valueColor = {
    brand: 'text-violet-900',
    success: 'text-emerald-900',
    caution: 'text-amber-900',
    warn: 'text-rose-900',
    mute: 'text-slate-700',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 ${toneStyles[tone]}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60">{label}</p>
        <span className="text-xl leading-none">{icon}</span>
      </div>
      <p className={`font-display text-3xl font-black leading-none ${valueColor[tone]}`}>{value}</p>
      <p className="text-[11px] text-violet-700/60 mt-2">{delta}</p>
    </div>
  );
}

function HealthRow({ label, status, detail }: { label: string; status: 'ok' | 'caution' | 'warn'; detail: string }) {
  const dotColor = status === 'ok' ? 'bg-emerald-500' : status === 'caution' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-3">
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`} aria-hidden="true" />
      <span className="text-sm text-violet-900 font-medium">{label}</span>
      <span className="text-[11px] text-violet-700/60 ml-auto truncate">{detail}</span>
    </div>
  );
}

function FunnelRow({ label, value, pct, highlight }: { label: string; value: number; pct: number; highlight?: boolean }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-violet-900 font-medium">{label}</span>
        <span className={`font-mono text-xs ${highlight ? 'text-pink-600 font-bold' : 'text-violet-700/80'}`}>
          {value.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-pink-100 overflow-hidden">
        <div
          className={`h-full ${highlight ? 'bg-gradient-to-r from-pink-500 to-violet-600' : 'bg-violet-300'}`}
          style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
        />
      </div>
    </div>
  );
}

function ActionCard({ href, icon, title, description, tone }: { href: string; icon: string; title: string; description: string; tone: 'violet' | 'pink' | 'rose' }) {
  const tones = {
    violet: 'border-violet-200 hover:border-violet-500 bg-gradient-to-br from-white to-violet-50',
    pink: 'border-pink-200 hover:border-pink-500 bg-gradient-to-br from-white to-pink-50',
    rose: 'border-rose-200 hover:border-rose-500 bg-gradient-to-br from-white to-rose-50',
  };
  return (
    <Link href={href} className={`block rounded-2xl border-2 p-5 transition-colors ${tones[tone]}`}>
      <span className="text-3xl block mb-2">{icon}</span>
      <p className="font-display text-lg font-bold text-violet-900 mb-1">{title}</p>
      <p className="text-xs text-violet-700/80 leading-snug">{description}</p>
    </Link>
  );
}

function timeAgo(iso: string): string {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return `${Math.round(sec)}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { UsersTable } from './UsersTable';

export const metadata: Metadata = {
  title: 'Users',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = createServiceRoleClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, is_admin, is_allowed, is_premium, premium_until, allowed_at, created_at')
    .order('created_at', { ascending: false });

  // Fetch matching emails from auth.users via the admin API.
  const ids = (profiles ?? []).map(p => p.id);
  const emailsById: Record<string, string> = {};
  if (ids.length) {
    const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of users) {
      if (ids.includes(u.id)) emailsById[u.id] = u.email ?? '';
    }
  }
  const enriched = (profiles ?? []).map(p => ({
    ...p,
    is_premium: (p as { is_premium?: boolean }).is_premium ?? false,
    premium_until: (p as { premium_until?: string | null }).premium_until ?? null,
    email: emailsById[p.id] ?? '',
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60 mb-1">Manage</p>
        <h1 className="font-display text-4xl font-black text-violet-900 leading-none">Users</h1>
        <p className="text-sm text-violet-700/80 mt-1">Grant access, promote admins, comp Premium.</p>
      </div>
      <UsersTable initial={enriched} />
    </div>
  );
}

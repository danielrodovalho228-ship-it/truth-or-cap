import { createServiceRoleClient } from '@/lib/supabase/server';
import { UsersTable } from './UsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = createServiceRoleClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, is_admin, is_allowed, allowed_at, created_at')
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
  const enriched = (profiles ?? []).map(p => ({ ...p, email: emailsById[p.id] ?? '' }));

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-display font-black text-violet-900 mb-2">Users</h1>
      <p className="text-violet-700/80 mb-6 text-sm">Manage who can access the app and who is admin.</p>
      <UsersTable initial={enriched} />
    </main>
  );
}

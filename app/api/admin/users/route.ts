import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';
import { isAdminAsync } from '@/lib/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminAsync(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { userId?: string; is_admin?: boolean; is_allowed?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { userId, is_admin, is_allowed } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Don't allow demoting yourself out of admin if you're the last admin.
  if (is_admin === false && userId === user.id) {
    const admin = createServiceRoleClient();
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_admin', true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (typeof is_admin === 'boolean') updates.is_admin = is_admin;
  if (typeof is_allowed === 'boolean') {
    updates.is_allowed = is_allowed;
    if (is_allowed) {
      updates.allowed_at = new Date().toISOString();
      updates.allowed_by = user.id;
    }
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { error } = await admin.from('profiles').update(updates).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

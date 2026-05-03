import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';
import { isAdminAsync } from '@/lib/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
    }
  }
  const ct = (req.headers.get('content-type') ?? '').split(';')[0].trim();
  if (ct !== 'application/json') {
    return NextResponse.json({ error: 'Unsupported Media Type' }, { status: 415 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminAsync(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { userId?: string; is_admin?: boolean; is_allowed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { userId, is_admin, is_allowed } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data: before } = await admin
    .from('profiles')
    .select('is_admin,is_allowed')
    .eq('id', userId)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (is_admin === false && userId === user.id) {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_admin', true);
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
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await admin.from('profiles').update(updates).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await admin.from('admin_audit_log').insert({
      actor_id: user.id,
      target_id: userId,
      action: 'profile.update',
      before,
      after: { ...before, ...updates },
    });
  } catch {
    /* audit table may not exist yet */
  }

  return NextResponse.json({ ok: true });
}

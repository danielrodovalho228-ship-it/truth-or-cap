import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Cascade-delete the calling user. RLS-tracked deletes happen via foreign-key
 * cascades on auth.users (set up in 0001_initial_schema). Storage objects need
 * an explicit purge via service role.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createServiceRoleClient();

  // Purge storage objects under the user's namespace.
  for (const bucket of ['recordings', 'voice-baselines', 'avatars']) {
    try {
      const { data: list } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
      if (list && list.length > 0) {
        await admin.storage.from(bucket).remove(list.map((f) => `${user.id}/${f.name}`));
      }
    } catch (err) {
      console.error(`[account/delete] storage cleanup ${bucket} failed`, err);
    }
  }

  // Auth user delete cascades into profiles → games → analyses → votes → etc.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    console.error('[account/delete] deleteUser failed:', deleteErr);
    return NextResponse.json({ error: 'Could not delete account' }, { status: 500 });
  }

  // Sign the (now-defunct) session out.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}

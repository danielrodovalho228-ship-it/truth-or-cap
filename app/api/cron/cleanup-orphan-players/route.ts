import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Periodic cron: deletes anon `room_players` rows that joined > 24h ago and
// never explicitly left. Calls public.cleanup_orphan_anon_players().
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc('cleanup_orphan_anon_players');
  if (error) {
    console.error('[cron/cleanup-orphan-players] failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deletedCount: data });
}

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Periodic cron: closes rooms that haven't seen activity in N hours.
// Calls the existing public.close_stale_rooms() Postgres function.
// Scheduled every 4 hours via vercel.json.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc('close_stale_rooms');
  if (error) {
    console.error('[cron/close-stale-rooms] failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, closedCount: data });
}

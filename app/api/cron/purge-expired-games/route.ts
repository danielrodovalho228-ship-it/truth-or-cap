import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Privacy compliance: enforce 7-day retention claim from /privacy.
// Vercel scheduled at 04:00 UTC daily.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();

  // First: list games scheduled for purge to clean up storage objects.
  const { data: expiring } = await admin
    .from('games')
    .select('id, recording_url')
    .lt('scheduled_purge_at', new Date().toISOString())
    .limit(500);

  // Storage cleanup
  if (expiring && expiring.length > 0) {
    const paths = expiring
      .map((g) => (g as { recording_url?: string }).recording_url)
      .filter(Boolean) as string[];
    if (paths.length > 0) {
      try {
        await admin.storage.from('recordings').remove(paths);
      } catch (err) {
        console.error('[cron/purge] storage cleanup failed', err);
      }
    }
  }

  // Then call DB function to drop rows (cascade analyses + votes).
  const { data, error } = await admin.rpc('purge_expired_games');
  if (error) {
    console.error('[cron/purge-expired-games] failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, purged: data });
}

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getWyrPrompt } from '@/lib/game-types';
import { buildWyrStats } from '@/lib/wyr';

export const runtime = 'nodejs';

// GET /api/wyr/stats?questionId=wyr_phone_or_photos
//
// Returns vote tallies for a single Would-You-Rather prompt. Open to anon
// callers — only aggregate counts are exposed (the SECURITY DEFINER RPC
// strips voter identities).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const questionId = url.searchParams.get('questionId');

  if (!questionId || !/^[a-z0-9_]+$/i.test(questionId) || questionId.length > 80) {
    return NextResponse.json({ error: 'Invalid questionId' }, { status: 400 });
  }
  if (!getWyrPrompt(questionId)) {
    return NextResponse.json({ error: 'Unknown question' }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc('wyr_question_stats', {
    p_question_id: questionId,
  });
  if (error) {
    console.error('[wyr/stats] rpc failed:', error);
    return NextResponse.json({ error: 'Stats unavailable' }, { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  const stats = buildWyrStats({
    questionId,
    votesA: Number(row?.votes_a ?? 0),
    votesB: Number(row?.votes_b ?? 0),
    total: Number(row?.total ?? 0),
  });

  return NextResponse.json(
    { ok: true, stats },
    {
      // Cache briefly at the edge — vote tallies don't need to be live to
      // the millisecond, and the same prompt will be requested on every
      // /wyr render.
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=10, stale-while-revalidate=30',
      },
    }
  );
}

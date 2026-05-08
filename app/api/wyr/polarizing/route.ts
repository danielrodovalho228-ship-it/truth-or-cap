import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getWyrPrompt } from '@/lib/game-types';

export const runtime = 'nodejs';

// GET /api/wyr/polarizing?mode=split|consensus&minVotes=10&limit=20
//
// `mode=split` (default): closest to 50/50.
// `mode=consensus`: most lopsided (everyone agreed).
// Returns rows joined with prompt copy so the client can render labels
// without re-running its own catalog lookup.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') === 'consensus' ? 'consensus' : 'split';
  const minVotes = clampInt(url.searchParams.get('minVotes'), 0, 1000, 10);
  const limit = clampInt(url.searchParams.get('limit'), 1, 50, 20);

  const admin = createServiceRoleClient();
  const rpcName = mode === 'consensus' ? 'wyr_consensus' : 'wyr_polarizing';
  const { data, error } = await admin.rpc(rpcName, {
    p_min_votes: minVotes,
    p_limit: limit,
  });
  if (error) {
    console.error(`[wyr/polarizing] ${rpcName} failed:`, error);
    return NextResponse.json({ error: 'Stats unavailable' }, { status: 500 });
  }

  const rows = (Array.isArray(data) ? data : []).flatMap((row) => {
    const prompt = getWyrPrompt(row.question_id);
    if (!prompt) return [];
    const total = Number(row.total ?? 0);
    const votesA = Number(row.votes_a ?? 0);
    const votesB = Number(row.votes_b ?? 0);
    const pctA = total > 0 ? Math.round((votesA / total) * 1000) / 10 : 0;
    const pctB = total > 0 ? Math.round((votesB / total) * 1000) / 10 : 0;
    return [
      {
        questionId: prompt.id,
        question: prompt.question,
        optionA: prompt.optionA,
        optionB: prompt.optionB,
        votesA,
        votesB,
        total,
        pctA,
        pctB,
        splitDistance: Number(row.split_distance ?? 0),
      },
    ];
  });

  return NextResponse.json(
    { ok: true, mode, rows },
    {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
      },
    }
  );
}

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

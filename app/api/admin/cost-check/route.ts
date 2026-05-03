import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Internal cost monitor — runs as a daily cron from Vercel (or manually
// triggered from /admin/costs). Sums the rolling 24h API spend and posts
// to the configured webhook (Slack/Discord/etc.) when above threshold.
//
// Required env:
//   COST_ALERT_THRESHOLD_USD  — fires when 24h spend exceeds this
//   COST_ALERT_WEBHOOK_URL    — Slack/Discord webhook (optional)
//   CRON_SECRET               — bearer token to gate this endpoint
//
// Vercel cron config (vercel.json):
//   { "crons": [{ "path": "/api/admin/cost-check", "schedule": "0 6 * * *" }] }

const DEFAULT_THRESHOLD = 50;

export async function GET(req: NextRequest) {
  // Cron auth: Vercel sets `Authorization: Bearer ${CRON_SECRET}` header.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const threshold = Number(process.env.COST_ALERT_THRESHOLD_USD ?? DEFAULT_THRESHOLD);
  const webhook = process.env.COST_ALERT_WEBHOOK_URL;

  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc('total_cost_in_window', { window_hours: 24 });
  if (error) {
    console.error('[cost-check] rpc failed:', error);
    return NextResponse.json({ error: 'RPC failed' }, { status: 500 });
  }

  const total = Number(data ?? 0);
  const overBudget = total > threshold;

  // Fetch top 5 users by spend in same window for context.
  const { data: topUsers } = await admin
    .from('api_cost_log')
    .select('user_id, cost_usd')
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const userTotals: Record<string, number> = {};
  for (const row of topUsers ?? []) {
    if (row.user_id) {
      userTotals[row.user_id] = (userTotals[row.user_id] ?? 0) + Number(row.cost_usd);
    }
  }
  const top5 = Object.entries(userTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([uid, cost]) => ({ user_id: uid, cost: cost.toFixed(4) }));

  const payload = {
    timestamp: new Date().toISOString(),
    total_24h_usd: total.toFixed(4),
    threshold_usd: threshold,
    over_budget: overBudget,
    top_5_users: top5,
  };

  if (overBudget && webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Discord-compatible; Slack-compatible too via "text" key.
          text: `🚨 Truth or Cap cost alert\n24h spend: $${total.toFixed(2)} (threshold $${threshold})\nTop user: ${top5[0]?.user_id ?? 'n/a'} ($${top5[0]?.cost ?? '0'})`,
          content: `🚨 Truth or Cap cost alert: $${total.toFixed(2)} in 24h (threshold $${threshold}). Top user: ${top5[0]?.user_id ?? 'n/a'} at $${top5[0]?.cost ?? '0'}.`,
        }),
      });
    } catch (err) {
      console.error('[cost-check] webhook failed:', err);
    }
  }

  return NextResponse.json(payload);
}

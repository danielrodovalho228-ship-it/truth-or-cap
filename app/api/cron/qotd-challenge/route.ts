import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { CHALLENGE_QUESTIONS } from '@/lib/questions';

export const runtime = 'nodejs';

// Daily cron — picks today's Question of the Day and Today's Challenge and
// upserts them into Supabase. Vercel triggers this once per day at 00:00 UTC.
//
// Required env:
//   CRON_SECRET — bearer token to gate this endpoint
//
// Vercel cron config (vercel.json):
//   { "crons": [{ "path": "/api/cron/qotd-challenge", "schedule": "0 0 * * *" }] }
//
// NOTE: schema lives in supabase/migrations/0003_qotd_and_challenge.sql.
// The actual table names are `question_of_day` and `daily_challenge`
// (singular). Columns are (question, active_date, ...) and
// (challenge, active_date) — there is no answer_expected/category column
// on daily_challenge today, so we don't try to write one.

// Curated QOTD pool — yes/no prompts that work as a Truth-or-Cap daily.
// Deterministic by day-of-year so the same date always picks the same one.
const QOTD_POOL: ReadonlyArray<string> = [
  'Have you cried alone in a car this year?',
  'Have you ever ghosted someone you actually liked?',
  'Have you ever lied about how much you spent on something?',
  'Have you ever pretended to read a book to sound smarter?',
  'Have you ever tagged someone in a photo to make an ex jealous?',
  'Have you ever finished a snack you bought to share, before sharing it?',
  'Have you ever lied about being sick to skip something?',
  'Have you ever rehearsed a "casual" text before sending it?',
  'Have you ever pretended to know a song while singing along?',
  'Have you ever taken credit for someone else’s idea?',
  'Have you ever screenshot a private chat and sent it elsewhere?',
  'Have you ever lied about your age — to anyone, ever?',
  'Have you ever pretended to like a gift in front of the giver?',
  'Have you ever stalked an ex on social media this week?',
  'Have you ever said "on my way" when you hadn’t left yet?',
  'Have you ever pretended to be busier than you actually are?',
  'Have you ever lied about loving a podcast you’ve never heard?',
  'Have you ever cancelled plans the day-of for no real reason?',
  'Have you ever cried because of a TikTok in the last month?',
  'Have you ever pretended to recognize someone who clearly knows you?',
  'Have you ever used a fake voice on a customer service call?',
  'Have you ever lied about your job at a party?',
  'Have you ever pretended your phone died to avoid replying?',
  'Have you ever Googled yourself this month?',
  'Have you ever envied a friend’s life on Instagram?',
  'Have you ever lied to a doctor about your habits?',
  'Have you ever pretended a workout was harder than it was?',
  'Have you ever judged someone for their grocery cart?',
  'Have you ever bailed on a friend and immediately gone out anyway?',
  'Have you ever drafted a message and never sent it?',
];

// Curated CHALLENGE pool — first-person prompts the user records a
// Truth-or-Cap answer to. Deterministic by day-of-year.
const CHALLENGE_POOL: ReadonlyArray<string> = [
  'Confess your guilty-pleasure song to someone judgmental.',
  'Tell us the last lie you told today.',
  'Admit one thing you Googled this week and regret.',
  'Read your last sent text out loud — and explain it.',
  'Tell us the worst gift you ever pretended to love.',
  'Confess the most expensive thing you bought and never used.',
  'Describe the pettiest reason you ever unfollowed someone.',
  'Tell us about a time you faked enthusiasm at work.',
  'Admit the dumbest thing you’ve ever lied to a parent about.',
  'Confess what you actually thought of your friend’s last big idea.',
  'Tell us the most embarrassing thing in your camera roll.',
  'Admit the last time you cried — and what triggered it.',
  'Read the last DM you regret out loud.',
  'Tell us a secret you kept from your best friend.',
  'Confess the worst excuse you ever used to skip plans.',
  'Describe a compliment you gave that you didn’t mean.',
  'Tell us a time you took credit for someone else’s work.',
  'Admit the longest you’ve ever ghosted a conversation.',
  'Confess the trend you publicly hated but secretly tried.',
  'Tell us the most you’ve ever spent on something silly.',
  'Read the last apology you sent — was it real?',
  'Admit the last time you pretended to laugh at a joke.',
  'Confess the show you said you finished but didn’t.',
  'Tell us the pettiest revenge you’ve ever taken.',
  'Describe the worst photo of yourself still online.',
  'Admit something nice you’ve never said to a parent.',
  'Confess the most dramatic thing you’ve done over a text.',
  'Tell us a rumor you helped spread — and the truth.',
  'Admit the meanest thing you’ve ever thought about a friend.',
  'Confess what you actually do when no one’s watching.',
];

function todayUtc(): string {
  // ISO date in UTC (YYYY-MM-DD).
  return new Date().toISOString().slice(0, 10);
}

function dayOfYearUtc(d: Date = new Date()): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

async function handle(req: NextRequest) {
  // Cron auth: Vercel sets `Authorization: Bearer ${CRON_SECRET}` header.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = todayUtc();
  const doy = dayOfYearUtc();
  const qotdText = QOTD_POOL[doy % QOTD_POOL.length];
  const challengeText = CHALLENGE_POOL[doy % CHALLENGE_POOL.length];

  const admin = createServiceRoleClient();

  // Upsert QOTD on (active_date) unique. Don't reset yes/no counts on conflict.
  const { data: qotd, error: qotdErr } = await admin
    .from('question_of_day')
    .upsert(
      { question: qotdText, active_date: today },
      { onConflict: 'active_date', ignoreDuplicates: false }
    )
    .select('id, question, active_date, yes_count, no_count')
    .single();

  if (qotdErr) {
    console.error('[cron/qotd-challenge] qotd upsert failed:', qotdErr);
    return NextResponse.json(
      { error: 'qotd upsert failed', detail: qotdErr.message },
      { status: 500 }
    );
  }

  // Upsert today's challenge on (active_date) unique.
  const { data: challenge, error: chErr } = await admin
    .from('daily_challenge')
    .upsert(
      { challenge: challengeText, active_date: today },
      { onConflict: 'active_date', ignoreDuplicates: false }
    )
    .select('id, challenge, active_date')
    .single();

  if (chErr) {
    console.error('[cron/qotd-challenge] challenge upsert failed:', chErr);
    return NextResponse.json(
      { error: 'challenge upsert failed', detail: chErr.message },
      { status: 500 }
    );
  }

  // Keep CHALLENGE_QUESTIONS imported so we can pivot back to the shared
  // pool later without re-wiring imports.
  void CHALLENGE_QUESTIONS;

  return NextResponse.json({ ok: true, qotd, challenge });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

/**
 * Notification sender. Single entrypoint: notify(kind, recipientUserId, payload).
 *
 * - Looks up the user's preferences (notification_preferences table)
 * - Checks dedup via notification_log (unique dedup_key)
 * - Sends via Resend if email channel is on
 * - Logs to notification_log with status
 *
 * Web push is delegated to lib/notifications/push.ts (separate module).
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { TEMPLATES, type NotificationKind } from './templates';

interface NotifyOptions {
  /** Optional dedup key — if a row with this key already exists, we skip. */
  dedupKey?: string;
  /** Force send even if user disabled this channel. Use sparingly (e.g. transactional). */
  force?: boolean;
}

const FROM = process.env.EMAIL_FROM ?? 'Truth or Cap <noreply@truthorcapapp.com>';
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://truthorcapapp.com';

// Map kind → email pref column
const EMAIL_PREF_COLUMN: Partial<Record<NotificationKind, string>> = {
  friend_joined: 'email_friend_joined',
  voted_on_you: 'email_voted_on_you',
  result_revealed: 'email_result_revealed',
  qotd_daily: 'email_qotd_daily',
  streak_reminder: 'email_streak_reminder',
  weekly_digest: 'email_weekly_digest',
  room_invite: 'email_room_invite',
  premium_upsell: 'email_marketing',
  // magic_link, confirm_signup, reset_password are transactional — always sent
};

export async function notifyEmail<K extends NotificationKind>(
  kind: K,
  recipient: { userId?: string; email: string },
  payload: Parameters<(typeof TEMPLATES)[K]>[0],
  options: NotifyOptions = {},
): Promise<{ ok: boolean; skipped?: string; error?: string; id?: string }> {
  const admin = createServiceRoleClient();

  // 1. Dedup check
  if (options.dedupKey) {
    const { data: existing } = await admin
      .from('notification_log')
      .select('id, status')
      .eq('dedup_key', options.dedupKey)
      .maybeSingle();
    if (existing) {
      return { ok: true, skipped: 'dedup' };
    }
  }

  // 2. Preference check (skip transactional kinds)
  if (recipient.userId && !options.force) {
    const prefCol = EMAIL_PREF_COLUMN[kind];
    if (prefCol) {
      const { data: prefs } = await admin
        .from('notification_preferences')
        .select(prefCol)
        .eq('user_id', recipient.userId)
        .maybeSingle();
      const prefVal = (prefs as Record<string, unknown> | null)?.[prefCol];
      if (prefs && prefVal === false) {
        await admin.from('notification_log').insert({
          user_id: recipient.userId,
          kind,
          channel: 'email',
          status: 'skipped',
          dedup_key: options.dedupKey ?? null,
          payload: payload as Record<string, unknown>,
        });
        return { ok: true, skipped: 'pref_off' };
      }
    }
  }

  // 3. Build template
  const factory = TEMPLATES[kind] as (p: unknown) => {
    subject: string;
    html: string;
    text: string;
  };
  const { subject, html, text } = factory(payload);

  // 4. Insert pending log row first (dedup race protection)
  const { data: logRow, error: logErr } = await admin
    .from('notification_log')
    .insert({
      user_id: recipient.userId ?? null,
      kind,
      channel: 'email',
      status: 'pending',
      dedup_key: options.dedupKey ?? null,
      payload: payload as Record<string, unknown>,
    })
    .select('id')
    .maybeSingle();

  if (logErr) {
    // Unique violation on dedup_key — another worker grabbed it.
    if (logErr.code === '23505') {
      return { ok: true, skipped: 'dedup_race' };
    }
    return { ok: false, error: logErr.message };
  }

  // 5. Send via Resend
  if (!RESEND_KEY) {
    console.warn('[notify] RESEND_API_KEY missing — would send', kind, 'to', recipient.email);
    if (logRow) {
      await admin
        .from('notification_log')
        .update({ status: 'failed', error: 'RESEND_API_KEY missing' })
        .eq('id', logRow.id);
    }
    return { ok: false, error: 'RESEND_API_KEY missing' };
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + RESEND_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [recipient.email],
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': '<' + SITE + '/settings/notifications>',
        },
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!r.ok) {
      if (logRow) {
        await admin
          .from('notification_log')
          .update({ status: 'failed', error: j.message ?? ('HTTP ' + r.status) })
          .eq('id', logRow.id);
      }
      return { ok: false, error: j.message ?? 'send failed' };
    }
    if (logRow) {
      await admin
        .from('notification_log')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', logRow.id);
    }
    return { ok: true, id: j.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    if (logRow) {
      await admin
        .from('notification_log')
        .update({ status: 'failed', error: msg })
        .eq('id', logRow.id);
    }
    return { ok: false, error: msg };
  }
}

/**
 * XP + Streaks helpers.
 *
 * The DB owns mutation (RLS denies client writes; SECURITY DEFINER RPCs are
 * the only way in). This module is the typed wrapper sitting on top of those
 * RPCs plus the level-curve math the UI reads to draw progress bars.
 *
 * Keep XP_VALUES + xpLevelFor in sync with supabase/migrations/0026_xp_streaks_leaderboard.sql.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const XP_VALUES = {
  game_complete: 50,
  correct_verdict: 25,
  daily_bonus: 100,
  friend_play: 25,
  streak_milestone: 50,
} as const;

export type XpReason = keyof typeof XP_VALUES;

export const STREAK_MULTIPLIER = 1.5;
export const STREAK_MULTIPLIER_THRESHOLD = 3;

/** Level curve: L = floor(sqrt(total / 100)) + 1. Mirrors the SQL function. */
export function xpLevelFor(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp <= 0) return 1;
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

/** Cumulative XP needed to reach a given level (level 1 = 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 100;
}

export interface LevelProgress {
  level: number;
  current: number;       // xp earned within this level
  needed: number;        // xp size of this level (for the bar's denominator)
  percent: number;       // 0..1
  toNext: number;        // xp remaining to next level
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = xpLevelFor(totalXp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const needed = ceil - floor;
  const current = totalXp - floor;
  const percent = needed > 0 ? Math.min(1, current / needed) : 0;
  return {
    level,
    current,
    needed,
    percent,
    toNext: Math.max(0, ceil - totalXp),
  };
}

export interface UserXpRow {
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_played_on: string | null;
  last_daily_bonus_on: string | null;
  updated_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  weekly_xp: number;
  is_self: boolean;
}

export type LeaderboardPeriod = 'weekly' | 'all_time';

/** Fetch the caller's user_xp row (creates it implicitly via DB trigger). */
export async function fetchUserXp(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserXpRow | null> {
  const { data, error } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[xp] fetchUserXp:', error.message);
    return null;
  }
  return (data as UserXpRow | null) ?? null;
}

/**
 * Records that the caller played today. Idempotent per UTC day:
 *   - First call of the day bumps streak + awards daily_bonus (100 XP).
 *   - Later calls return the unchanged state.
 *
 * Safe to fire-and-forget on every signed-in page load.
 */
export async function recordDailyPlay(supabase: SupabaseClient): Promise<{
  current_streak: number;
  longest_streak: number;
  awarded_daily_bonus: boolean;
  total_xp: number;
  current_level: number;
} | null> {
  const { data, error } = await supabase.rpc('record_daily_play');
  if (error) {
    console.error('[xp] record_daily_play:', error.message);
    return null;
  }
  // Postgres returns SETOF — Supabase normalizes to an array.
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

/** Self-award XP for an action the caller performed (auth.uid() drives it). */
export async function awardXp(
  supabase: SupabaseClient,
  reason: XpReason,
  baseAmount: number = XP_VALUES[reason],
  context?: Record<string, unknown>,
): Promise<{
  total_xp: number;
  current_level: number;
  amount_awarded: number;
  multiplier: number;
  current_streak: number;
} | null> {
  const { data, error } = await supabase.rpc('award_xp', {
    p_reason: reason,
    p_base_amount: baseAmount,
    p_context: context ?? null,
  });
  if (error) {
    console.error('[xp] award_xp:', error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

/**
 * Service-role variant: award XP to a specific user (used by reveal handler
 * on behalf of the prompter / correct voters). SupabaseClient must be the
 * service-role client.
 */
export async function awardXpForUser(
  serviceSupabase: SupabaseClient,
  userId: string,
  reason: XpReason,
  baseAmount: number = XP_VALUES[reason],
  context?: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceSupabase.rpc('award_xp_for_user', {
    p_user_id: userId,
    p_reason: reason,
    p_base_amount: baseAmount,
    p_context: context ?? null,
  });
  if (error) {
    console.error('[xp] award_xp_for_user:', error.message);
  }
}

export async function getFriendsLeaderboard(
  supabase: SupabaseClient,
  period: LeaderboardPeriod,
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_friends_leaderboard', {
    p_period: period,
  });
  if (error) {
    console.error('[xp] get_friends_leaderboard:', error.message);
    return [];
  }
  return (data as LeaderboardRow[]) ?? [];
}

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { recordDailyPlay } from '@/lib/xp';

/**
 * Bump the caller's streak + grant the once-per-day bonus on any signed-in
 * page render. The underlying RPC is idempotent per UTC day and React.cache
 * dedupes within a single request (so /home's explicit call and requireUser's
 * implicit call share a single round trip). Returns the daily state so pages
 * can render the streak badge without making a second RPC. Failures are
 * swallowed — streak updates must never break a page render.
 */
export const ensureDailyPlay = cache(async (): Promise<{
  current_streak: number;
  longest_streak: number;
  awarded_daily_bonus: boolean;
  total_xp: number;
  current_level: number;
} | null> => {
  try {
    const supabase = await createClient();
    return await recordDailyPlay(supabase);
  } catch (err) {
    console.error('[auth/guard] ensureDailyPlay:', err);
    return null;
  }
});

/**
 * Use in server components / server actions to require an authenticated user.
 * Redirects to /auth/sign-in?next=<path> if not signed in.
 */
export async function requireUser(redirectTo?: string): Promise<User> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const next = redirectTo ?? '/';
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }
  await ensureDailyPlay();
  return data.user;
}

/**
 * Like requireUser but also fetches the user's profile row.
 */
export async function requireProfile(redirectTo?: string) {
  const user = await requireUser(redirectTo);
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('[auth/guard] profile missing:', error?.message);
    // Profile should exist via DB trigger; if not, kick to onboarding which
    // can repair the row.
    redirect('/onboarding');
  }
  return { user, profile };
}

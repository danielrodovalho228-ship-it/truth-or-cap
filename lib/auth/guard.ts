import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

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

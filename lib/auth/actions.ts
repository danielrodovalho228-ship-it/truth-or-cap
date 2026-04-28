'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  validateEmail,
  validateUsername,
  validatePassword,
  normalizeEmail,
  normalizeUsername,
  getSiteUrl,
} from './utils';

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

/**
 * Sign up via magic link with username metadata.
 * Username is validated + uniqueness-checked server-side.
 */
export async function signUpWithMagicLink(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const emailRaw = (formData.get('email') as string) ?? '';
  const usernameRaw = (formData.get('username') as string) ?? '';

  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };

  const usernameCheck = validateUsername(usernameRaw);
  if (!usernameCheck.ok) return { ok: false, error: usernameCheck.error };

  const email = normalizeEmail(emailRaw);
  const username = normalizeUsername(usernameRaw);

  // Uniqueness check (case-insensitive via index on lowercased compare in DB).
  // The unique constraint will also catch races at insert time.
  const admin = createServiceRoleClient();
  const { data: existing, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();

  if (lookupError) {
    console.error('[auth] username lookup failed:', lookupError.message);
    return { ok: false, error: 'Could not check username availability. Try again.' };
  }
  if (existing) {
    return { ok: false, error: 'Username taken' };
  }

  const supabase = await createClient();
  const reqHeaders = await headers();
  const siteUrl = getSiteUrl(reqHeaders.get('origin'));

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
      data: { username },
    },
  });

  if (otpError) {
    console.error('[auth] signUp magic link failed:', otpError.message);
    return { ok: false, error: 'Could not send magic link. Try again.' };
  }

  return { ok: true, message: `Check ${email}. Magic link expires in 1h.` };
}

export async function signInWithMagicLink(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const emailRaw = (formData.get('email') as string) ?? '';
  const next = ((formData.get('next') as string) || '/').trim();

  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };

  const email = normalizeEmail(emailRaw);
  const supabase = await createClient();
  const reqHeaders = await headers();
  const siteUrl = getSiteUrl(reqHeaders.get('origin'));

  const safeNext = next.startsWith('/') ? next : '/';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // sign-in won't create new accounts
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error) {
    // Supabase returns a generic error if user doesn't exist — that's fine for security.
    console.error('[auth] signIn magic link failed:', error.message);
    return { ok: false, error: 'Could not send magic link. Try again.' };
  }

  return { ok: true, message: `Check ${email}. Magic link expires in 1h.` };
}

/**
 * Password fallback sign-in. Magic link is preferred but some users want this.
 */
export async function signInWithPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const emailRaw = (formData.get('email') as string) ?? '';
  const password = (formData.get('password') as string) ?? '';

  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };
  const passCheck = validatePassword(password);
  if (!passCheck.ok) return { ok: false, error: passCheck.error };

  const email = normalizeEmail(emailRaw);
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[auth] password sign-in failed:', error.message);
    return { ok: false, error: 'Wrong email or password' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * Password sign-up with username. Less primary path but useful for testers
 * who don't want to wait for emails.
 */
export async function signUpWithPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const emailRaw = (formData.get('email') as string) ?? '';
  const usernameRaw = (formData.get('username') as string) ?? '';
  const password = (formData.get('password') as string) ?? '';

  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };
  const usernameCheck = validateUsername(usernameRaw);
  if (!usernameCheck.ok) return { ok: false, error: usernameCheck.error };
  const passCheck = validatePassword(password);
  if (!passCheck.ok) return { ok: false, error: passCheck.error };

  const email = normalizeEmail(emailRaw);
  const username = normalizeUsername(usernameRaw);

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();
  if (existing) return { ok: false, error: 'Username taken' };

  const supabase = await createClient();
  const reqHeaders = await headers();
  const siteUrl = getSiteUrl(reqHeaders.get('origin'));

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding`,
      data: { username },
    },
  });

  if (error) {
    console.error('[auth] password sign-up failed:', error.message);
    return { ok: false, error: 'Could not create account. Try again.' };
  }

  return { ok: true, message: `Check ${email} to confirm your account.` };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

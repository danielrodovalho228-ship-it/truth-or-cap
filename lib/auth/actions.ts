'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
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

async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

function safeRelative(next: string | null | undefined): string {
  if (!next) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//')) return '/';
  if (next.startsWith('/\\')) return '/';
  return next;
}

export async function signUpWithMagicLink(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const emailRaw = (formData.get('email') as string) ?? '';
  const usernameRaw = (formData.get('username') as string) ?? '';
  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };
  const usernameCheck = validateUsername(usernameRaw);
  if (!usernameCheck.ok) return { ok: false, error: usernameCheck.error };
  const email = normalizeEmail(emailRaw);
  const username = normalizeUsername(usernameRaw);
  const ip = await getClientIp();
  const rl = rateLimit('signup:' + ip, 10, 15 * 60000);
  if (!rl.allowed) return { ok: false, error: 'Too many attempts. Try again later.' };
  const safeUsername = username.replace(/[%_\\]/g, '\\$&');
  const admin = createServiceRoleClient();
  const { data: existing, error: lookupError } = await admin.from('profiles').select('id').ilike('username', safeUsername).maybeSingle();
  if (lookupError) {
    console.error('[auth] username lookup failed:', lookupError.message);
    return { ok: false, error: 'Could not start signup. Try again.' };
  }
  if (existing) return { ok: false, error: 'Could not start signup. Try a different username.' };
  const supabase = await createClient();
  const reqHeaders = await headers();
  const siteUrl = getSiteUrl(reqHeaders.get('origin'));
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: siteUrl + '/auth/callback?next=/onboarding', data: { username } },
  });
  if (otpError) {
    console.error('[auth] signUp magic link failed:', otpError.message);
    return { ok: false, error: 'Could not send magic link. Try again.' };
  }
  return { ok: true, message: 'If ' + email + ' is valid, you will get a magic link.' };
}

export async function signInWithMagicLink(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const emailRaw = (formData.get('email') as string) ?? '';
  const next = ((formData.get('next') as string) || '/').trim();
  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };
  const email = normalizeEmail(emailRaw);
  const ip = await getClientIp();
  const rl = rateLimit('signin-magic:' + ip + ':' + email, 5, 15 * 60000);
  if (!rl.allowed) return { ok: false, error: 'Too many attempts. Try again later.' };
  const supabase = await createClient();
  const reqHeaders = await headers();
  const siteUrl = getSiteUrl(reqHeaders.get('origin'));
  const safeNext = safeRelative(next);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: siteUrl + '/auth/callback?next=' + encodeURIComponent(safeNext) },
  });
  if (error) {
    console.error('[auth] signIn magic link failed:', error.message);
    return { ok: false, error: 'Could not send magic link. Try again.' };
  }
  return { ok: true, message: 'Check ' + email + '. Magic link expires in 1h.' };
}

export async function signInWithPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const emailRaw = (formData.get('email') as string) ?? '';
  const password = (formData.get('password') as string) ?? '';
  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };
  const passCheck = validatePassword(password);
  if (!passCheck.ok) return { ok: false, error: passCheck.error };
  const email = normalizeEmail(emailRaw);
  const ip = await getClientIp();
  const rlIp = rateLimit('pw:' + ip, 20, 15 * 60000);
  const rlEmail = rateLimit('pw:' + email, 8, 15 * 60000);
  if (!rlIp.allowed || !rlEmail.allowed) return { ok: false, error: 'Too many login attempts. Try again later.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('[auth] password sign-in failed:', error.message);
    return { ok: false, error: 'Wrong email or password' };
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

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
  const ip = await getClientIp();
  const rl = rateLimit('signup-pw:' + ip, 10, 15 * 60000);
  if (!rl.allowed) return { ok: false, error: 'Too many attempts. Try again later.' };
  const safeUsername = username.replace(/[%_\\]/g, '\\$&');
  const admin = createServiceRoleClient();
  const { data: existing } = await admin.from('profiles').select('id').ilike('username', safeUsername).maybeSingle();
  if (existing) return { ok: false, error: 'Could not start signup. Try a different username.' };
  const supabase = await createClient();
  const reqHeaders = await headers();
  const siteUrl = getSiteUrl(reqHeaders.get('origin'));
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: siteUrl + '/auth/confirm?next=/onboarding', data: { username } },
  });
  if (error) {
    console.error('[auth] password sign-up failed:', error.message);
    return { ok: false, error: 'Could not create account. Try again.' };
  }
  return { ok: true, message: 'If ' + email + ' is valid, check your inbox to confirm.' };
}


export async function requestPasswordReset(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const emailRaw = (formData.get('email') as string) ?? '';
  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };
  const email = normalizeEmail(emailRaw);

  const ip = await getClientIp();
  const rl = rateLimit('reset:' + ip + ':' + email, 5, 15 * 60000);
  if (!rl.allowed) return { ok: false, error: 'Too many attempts. Try again later.' };

  const supabase = await createClient();
  const reqHeaders = await headers();
  const siteUrl = getSiteUrl(reqHeaders.get('origin'));
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl + '/auth/reset-password',
  });
  if (error) {
    console.error('[auth] reset password failed:', error.message);
  }
  // Always return success to avoid email enumeration.
  return { ok: true, message: 'If ' + email + ' is registered, a reset link is on the way.' };
}

export async function updatePassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const password = (formData.get('password') as string) ?? '';
  const confirm = (formData.get('confirm') as string) ?? '';
  if (password !== confirm) return { ok: false, error: 'Passwords do not match' };
  const passCheck = validatePassword(password);
  if (!passCheck.ok) return { ok: false, error: passCheck.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Reset link expired. Request a new one.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error('[auth] updatePassword failed:', error.message);
    return { ok: false, error: 'Could not update password.' };
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

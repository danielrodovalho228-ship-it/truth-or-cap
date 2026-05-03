import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/auth/utils';

/**
 * Magic link / OTP callback. Supabase redirects here with a short-lived
 * `code` param (PKCE flow). We exchange it for a session, then bounce
 * the user to ?next=... or "/" by default.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const baseUrl = getSiteUrl(requestUrl.origin);
  const code = requestUrl.searchParams.get('code');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next');
  // Block protocol-relative redirects like //evil.tld/x.
  const safeNext =
    next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
      ? next
      : '/';

  if (errorDescription) {
    const url = new URL('/auth/sign-in', baseUrl);
    url.searchParams.set('error', 'expired');
    return NextResponse.redirect(url);
  }

  if (!code) {
    const url = new URL('/auth/sign-in', baseUrl);
    url.searchParams.set('error', 'missing');
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchange failed:', error.message);
    const url = new URL('/auth/sign-in', baseUrl);
    url.searchParams.set('error', 'expired');
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(safeNext, baseUrl));
}

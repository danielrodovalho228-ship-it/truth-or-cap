import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/auth/utils';

/**
 * Magic link / OTP callback. Supabase redirects here with a short-lived
 * `code` param (PKCE flow). We exchange it for a session, then bounce
 * the user to ?next=... or "/" by default.
 *
 * We always build redirects from NEXT_PUBLIC_SITE_URL when available, so
 * the user never lands on the bind address (e.g. 0.0.0.0:3000).
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const baseUrl = getSiteUrl(requestUrl.origin);
  const code = requestUrl.searchParams.get('code');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next');
  const safeNext = next && next.startsWith('/') ? next : '/';

  if (errorDescription) {
    const url = new URL('/auth/sign-in', baseUrl);
    url.searchParams.set('error', errorDescription);
    return NextResponse.redirect(url);
  }

  if (!code) {
    const url = new URL('/auth/sign-in', baseUrl);
    url.searchParams.set('error', 'Missing auth code');
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchange failed:', error.message);
    const url = new URL('/auth/sign-in', baseUrl);
    url.searchParams.set('error', 'Link expired or already used');
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(safeNext, baseUrl));
}

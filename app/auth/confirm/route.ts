import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/auth/utils';

/**
 * Email confirmation handler — handles signup confirmations + email change
 * confirmations. Supabase sends a token_hash + type, NOT a code.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const baseUrl = getSiteUrl(requestUrl.origin);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next');
  const safeNext =
    next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
      ? next
      : '/';

  if (!token_hash || !type) {
    const url = new URL('/auth/sign-in', baseUrl);
    url.searchParams.set('error', 'missing');
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    console.error('[auth/confirm] verify failed:', error.message);
    const url = new URL('/auth/sign-in', baseUrl);
    url.searchParams.set('error', 'expired');
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(safeNext, baseUrl));
}

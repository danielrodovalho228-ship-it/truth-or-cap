import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}

// GET is intentionally NOT supported. A GET sign-out endpoint can be
// triggered by browser prefetch, link scanners, or extensions and silently
// log the user out. Sign-out must be an explicit POST.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/settings', request.url), { status: 303 });
}

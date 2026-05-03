import { NextResponse, type NextRequest } from 'next/server';
import { LANGS, type Lang } from '@/lib/i18n/messages';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // CSRF defense: only same-origin POST
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
    }
  }

  const { lang } = (await req.json().catch(() => ({}))) as { lang?: string };
  if (!lang || !LANGS.includes(lang as Lang)) {
    return NextResponse.json({ error: 'Invalid lang' }, { status: 400 });
  }
  const resp = NextResponse.json({ ok: true, lang });
  resp.cookies.set('lang', lang, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  return resp;
}

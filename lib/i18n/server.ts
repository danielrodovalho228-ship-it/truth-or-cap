import { cookies, headers } from 'next/headers';
import { pickLang, type Lang } from './messages';

/** Resolve language for the current server-side render. */
export async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return pickLang({
    cookieLang: cookieStore.get('lang')?.value,
    acceptLanguage: headerStore.get('accept-language'),
  });
}

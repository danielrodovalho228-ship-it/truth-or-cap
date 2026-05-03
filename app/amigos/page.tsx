import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { generatedAvatarUrl } from '@/lib/avatar';
import { getLang } from '@/lib/i18n/server';
import { t } from '@/lib/i18n/messages';

export const metadata: Metadata = {
  title: 'Friends · Truth or Cap',
  robots: { index: false },
};

export default async function FriendsPage() {
  const user = await requireUser('/amigos');
  const supabase = await createClient();
  const lang = await getLang();

  const { data: friendIds } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', user.id);

  const ids = (friendIds ?? []).map((f) => f.friend_id);

  const { data: friends } = ids.length
    ? await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ids)
    : { data: [] };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">
          {t(lang, 'friends.back')}
        </Link>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-3">{t(lang, 'friends.label')}</p>
        <h1 className="font-display text-5xl font-black leading-[0.9] mb-6">
          {t(lang, 'friends.title.line1')}<br />
          <span className="italic font-light">{t(lang, 'friends.title.line2')}</span>
        </h1>

        {(friends?.length ?? 0) > 0 ? (
          <ul className="space-y-2">
            {friends!.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/perfil/${f.username}`}
                  className="flex items-center gap-3 border-2 border-line hover:border-fg p-3 transition-colors"
                >
                  <div className="w-10 h-10 border-2 border-line overflow-hidden flex-shrink-0">
                    <Image
                      src={f.avatar_url ?? generatedAvatarUrl(f.username)}
                      alt=""
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="font-display text-lg flex-1">@{f.username}</span>
                  <span className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-2 border-line p-6 text-center">
            <p className="font-display text-2xl font-black leading-tight mb-2">
              {t(lang, 'friends.empty.title')}
            </p>
            <p className="font-body text-sm text-fg-muted mb-4 leading-snug">
              {t(lang, 'friends.empty.subtitle')}
            </p>
            <Link href="/onboarding/friends">
              <span className="border-2 border-fg bg-fg text-bg px-5 py-3 font-display text-base font-black uppercase inline-block">
                {t(lang, 'friends.empty.cta')}
              </span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

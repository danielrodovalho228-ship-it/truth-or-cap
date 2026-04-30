import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { generatedAvatarUrl } from '@/lib/avatar';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} · Truth or Cap`,
    description: `${username}'s public games on Truth or Cap.`,
    openGraph: {
      title: `@${username} on Truth or Cap`,
      description: 'AI-powered lie detector game.',
      images: [{ url: `/perfil/${username}/opengraph-image`, width: 1200, height: 630 }],
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, current_streak, total_invites_redeemed, is_public, created_at')
    .ilike('username', username)
    .maybeSingle();
  if (!profile || profile.is_public === false) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isOwn = user?.id === profile.id;

  const { data: games } = await supabase
    .from('games')
    .select('id, question, declared_answer, created_at')
    .eq('player_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(12);

  const avatar = profile.avatar_url ?? generatedAvatarUrl(profile.username);

  return (
    <main className="min-h-screen flex flex-col">
      <div className="tape-stripes h-3 w-full" />

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Link href="/" className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted hover:text-fg mb-6 inline-block">
          ← truthorcap
        </Link>

        <header className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 border-2 border-fg overflow-hidden flex-shrink-0">
            <Image src={avatar} alt="" width={80} height={80} className="w-full h-full object-cover" unoptimized />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-1">
              Profile
            </p>
            <h1 className="font-display text-3xl font-black leading-[0.95] truncate">@{profile.username}</h1>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mt-1">
              streak {profile.current_streak} · {profile.total_invites_redeemed} invites redeemed
            </p>
          </div>
        </header>

        {isOwn ? (
          <Link href="/settings" className="block mb-6">
            <Button variant="secondary" size="md" fullWidth>Edit profile</Button>
          </Link>
        ) : (
          <Link href={`/game/new?opponent=${encodeURIComponent(profile.username)}`} className="block mb-6">
            <Button size="md" fullWidth>Challenge @{profile.username}</Button>
          </Link>
        )}

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-3">
          Recent games
        </p>

        {games && games.length > 0 ? (
          <ul className="space-y-2">
            {games.map((g) => (
              <li key={g.id}>
                <Link href={`/game/${g.id}`} className="block border-2 border-line hover:border-fg p-3 transition-colors">
                  <p className={cn(
                    'font-mono text-[10px] tracking-widest uppercase mb-1',
                    g.declared_answer === 'truth' ? 'text-acid' : 'text-blood'
                  )}>
                    {g.declared_answer.toUpperCase()} · {new Date(g.created_at).toLocaleDateString()}
                  </p>
                  <p className="font-display text-base leading-snug">&ldquo;{g.question}&rdquo;</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-mono text-xs tracking-widest uppercase text-fg-muted">
            No public games yet.
          </p>
        )}
      </div>

      <div className="tape-stripes h-3 w-full" />
    </main>
  );
}

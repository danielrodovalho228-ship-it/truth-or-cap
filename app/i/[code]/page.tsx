import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { InviteRedeemer } from './InviteRedeemer';

interface PageProps {
  params: Promise<{ code: string }>;
}

// We use service role for both reads — anonymous visitors landing on
// /i/<code> need to see the invite, but RLS on `invitations` only allows
// the inviter to read their own. The page only reveals the inviter's
// public username + avatar, so this is safe.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const admin = createServiceRoleClient();
  const { data: invite } = await admin
    .from('invitations')
    .select('id, inviter:profiles!inviter_id(username)')
    .eq('invite_code', code)
    .maybeSingle();

  const inviter = (invite?.inviter as { username?: string } | null)?.username ?? 'someone';
  return {
    title: `@${inviter} invited you to Truth or Cap`,
    description: 'Spot the cap. Become the cap.',
    openGraph: {
      title: `@${inviter} wants you in Truth or Cap`,
      description: 'AI-powered voice + video lie detector game.',
    },
    robots: { index: false },
  };
}

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;
  const admin = createServiceRoleClient();
  const { data: invite } = await admin
    .from('invitations')
    .select(`
      id, invite_code, context, source_game_id, redeemed_at, expires_at,
      inviter:profiles!inviter_id (id, username, avatar_url)
    `)
    .eq('invite_code', code)
    .maybeSingle();

  if (!invite) notFound();

  const inviter = invite.inviter as unknown as { id: string; username: string; avatar_url: string | null } | null;
  if (!inviter) notFound();

  const expired = invite.redeemed_at !== null || new Date(invite.expires_at) < new Date();

  return (
    <InviteRedeemer
      code={invite.invite_code}
      context={(invite.context as string) ?? 'manual'}
      sourceGameId={invite.source_game_id as string | null}
      inviter={inviter}
      expired={expired}
    />
  );
}

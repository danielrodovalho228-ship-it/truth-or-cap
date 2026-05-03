'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { generatedAvatarUrl } from '@/lib/avatar';

interface InviteRedeemerProps {
  code: string;
  context: string;
  sourceGameId: string | null;
  inviter: { id: string; username: string; avatar_url: string | null };
  expired: boolean;
}

const COPY: Record<string, (u: string) => string> = {
  curiosity: (u) => `${u} wants to know if you can spot their cap.`,
  challenge: (u) => `${u} thinks they can fool the AI better than you. Prove them wrong.`,
  streak: (u) => `${u}'s streak depends on you. No pressure.`,
  group: (u) => `${u}'s squad detector unlocks when you join.`,
  leaderboard: (u) => `${u}'s ranking is locked until you sign up.`,
  manual: (u) => `${u} thinks you'll like this.`,
};

export function InviteRedeemer({ code, context, sourceGameId, inviter, expired }: InviteRedeemerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const accept = () => {
    startTransition(() => {
      router.push(`/auth/sign-up?invite=${encodeURIComponent(code)}`);
    });
  };

  const avatarUrl = inviter.avatar_url ?? generatedAvatarUrl(inviter.username);
  const copy = (COPY[context] ?? COPY.manual)(`@${inviter.username}`);

  if (expired) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="tape-stripes h-2 w-full absolute top-0" />
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-blood mb-3">
          Invite expired
        </p>
        <h1 className="font-display text-4xl font-black mb-3">
          This case is closed.
        </h1>
        <p className="font-body text-sm text-fg-muted max-w-sm mb-6">
          The invite was already redeemed or has expired. Ask them to send a fresh one.
        </p>
        <Link href="/">
          <Button size="md">Back home</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="tape-stripes h-2 w-full absolute top-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md"
      >
        <div className="w-24 h-24 mx-auto mb-4 border-2 border-mustard overflow-hidden">
          <Image
            src={avatarUrl}
            alt=""
            width={96}
            height={96}
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>

        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-mustard mb-2">
          You&apos;ve been invited
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.95] mb-4">
          @{inviter.username}{' '}
          <span className="italic font-light">wants you</span>
        </h1>
        <p className="font-display text-lg text-fg-muted mb-8 max-w-sm mx-auto">
          {copy}
        </p>

        <Button onClick={accept} size="xl" fullWidth disabled={pending}>
          {pending ? 'Loading…' : 'Accept the invite →'}
        </Button>

        {sourceGameId ? (
          <Link
            href={`/jogo/${sourceGameId}`}
            className="block mt-4 font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg"
          >
            Watch their game first
          </Link>
        ) : null}

        <p className="font-mono text-[10px] tracking-widest uppercase text-fg-muted mt-6">
          90 sec setup · Free forever
        </p>
      </motion.div>

      <div className="tape-stripes h-2 w-full absolute bottom-0" />
    </main>
  );
}

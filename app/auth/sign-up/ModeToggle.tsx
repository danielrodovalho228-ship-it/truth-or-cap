import Link from 'next/link';

export function ModeToggle({ current }: { current: 'magic' | 'password' }) {
  const otherHref = current === 'magic' ? '/auth/sign-up?mode=password' : '/auth/sign-up';
  const otherLabel = current === 'magic' ? 'Use password instead' : 'Use magic link instead';
  return (
    <p className="text-center">
      <Link
        href={otherHref}
        className="font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg underline underline-offset-4"
      >
        {otherLabel}
      </Link>
    </p>
  );
}

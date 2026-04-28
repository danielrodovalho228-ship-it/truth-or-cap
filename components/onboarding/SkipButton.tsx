'use client';

import Link from 'next/link';

interface SkipButtonProps {
  href: string;
}

export function SkipButton({ href }: SkipButtonProps) {
  return (
    <Link
      href={href}
      className="font-mono text-[10px] tracking-widest uppercase text-fg-muted hover:text-fg transition-colors"
    >
      Skip →
    </Link>
  );
}

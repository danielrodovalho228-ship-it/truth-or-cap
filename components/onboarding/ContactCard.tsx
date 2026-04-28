'use client';

import Image from 'next/image';
import type { MatchedFriend } from '@/lib/contacts';
import { cn } from '@/lib/utils';

interface ContactCardProps {
  friend: MatchedFriend;
  selected: boolean;
  onToggle: () => void;
}

export function ContactCard({ friend, selected, onToggle }: ContactCardProps) {
  const initial = (friend.username || '?').slice(0, 1).toUpperCase();

  return (
    <button
      onClick={onToggle}
      type="button"
      className={cn(
        'w-full flex items-center gap-3 p-3 border-2 transition-colors text-left',
        selected ? 'border-acid bg-acid/10' : 'border-line hover:border-fg-muted'
      )}
      aria-pressed={selected}
    >
      <div className="w-10 h-10 rounded-full bg-bg-card overflow-hidden flex items-center justify-center flex-shrink-0">
        {friend.avatar_url ? (
          <Image
            src={friend.avatar_url}
            alt=""
            width={40}
            height={40}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <span className="font-display text-lg font-black">{initial}</span>
        )}
      </div>
      <span className="font-display text-base flex-1">@{friend.username}</span>
      <span
        className={cn(
          'w-6 h-6 border-2 flex items-center justify-center font-mono text-xs',
          selected ? 'bg-acid border-acid text-bg' : 'border-line text-transparent'
        )}
      >
        ✓
      </span>
    </button>
  );
}

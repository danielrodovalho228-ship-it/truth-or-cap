'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Vote } from '@/lib/types';

export interface VoteCounts {
  truth: number;
  cap: number;
}

/**
 * Subscribe to live vote inserts on a given game. Server passes the initial
 * counts so the first paint isn't 0/0.
 */
export function useRealtimeVotes(gameId: string, initial: VoteCounts): VoteCounts {
  const [counts, setCounts] = useState<VoteCounts>(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`votes:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const vote = (payload.new as { vote?: Vote })?.vote;
          if (vote === 'truth') setCounts((c) => ({ ...c, truth: c.truth + 1 }));
          else if (vote === 'cap') setCounts((c) => ({ ...c, cap: c.cap + 1 }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  return counts;
}

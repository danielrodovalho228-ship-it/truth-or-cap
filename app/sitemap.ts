import type { MetadataRoute } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

const BASE_URL = 'https://truthorcapapp.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/challenge`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/premium`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${BASE_URL}/cookies`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${BASE_URL}/auth/sign-in`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${BASE_URL}/auth/sign-up`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
  ];

  // Most recent 50 revealed share rounds. Best-effort: if Supabase is not
  // reachable from the build environment, we silently skip these entries.
  let shareEntries: MetadataRoute.Sitemap = [];
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const admin = createServiceRoleClient();
      const { data: rounds } = await admin
        .from('room_rounds')
        .select('id, revealed_at')
        .not('revealed_at', 'is', null)
        .order('revealed_at', { ascending: false })
        .limit(50);
      shareEntries = (rounds ?? []).map((r: { id: string; revealed_at: string | null }) => ({
        url: `${BASE_URL}/share/round/${r.id}`,
        lastModified: r.revealed_at ? new Date(r.revealed_at) : now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }));
    }
  } catch {
    shareEntries = [];
  }

  return [...staticEntries, ...shareEntries];
}

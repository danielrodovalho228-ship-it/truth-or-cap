import type { Lang } from './messages';

// Routes that have parallel EN/PT segments. Each entry is a base path (no
// trailing slash) plus the EN and PT segment that should be swapped.
//
// Keep this list small — only true duplicates with full feature parity. Routes
// that exist in just one language (e.g. /home, /challenge, /settings) live
// outside this map and are returned unchanged.
const ROUTE_PAIRS: Array<{ en: string; pt: string }> = [
  { en: '/game/select', pt: '/jogo/select' },
  { en: '/game/new', pt: '/jogo/novo' },
  { en: '/game', pt: '/jogo' },
  { en: '/friends', pt: '/amigos' },
];

/**
 * Translate a path to the requested language. If the path doesn't match any
 * known parallel route, it is returned unchanged.
 *
 * Handles nested paths: `/friends/find` → `/amigos/find` (only the leading
 * segment is swapped). `/game/select?audience=friends` → `/jogo/select?...`.
 */
export function localizePath(path: string, target: Lang): string {
  if (!path || path === '/') return path;

  // Split into pathname + search/hash so we don't mangle query strings.
  const [pathname, ...rest] = path.split(/(?=[?#])/);
  const tail = rest.join('');

  for (const pair of ROUTE_PAIRS) {
    const from = target === 'en' ? pair.pt : pair.en;
    const to = target === 'en' ? pair.en : pair.pt;
    if (pathname === from) return to + tail;
    if (pathname.startsWith(from + '/')) return to + pathname.slice(from.length) + tail;
  }
  return path;
}

/**
 * Build a nav href for a given language. Used by BottomNav so that switching
 * languages updates which `/game/select` vs `/jogo/select` we link to.
 */
export const navPath = {
  home: () => '/home',
  daily: () => '/challenge',
  detector: (lang: Lang) => (lang === 'pt' ? '/jogo/select' : '/game/select'),
  friends: (lang: Lang) => (lang === 'pt' ? '/amigos' : '/friends'),
  profile: () => '/settings',
};

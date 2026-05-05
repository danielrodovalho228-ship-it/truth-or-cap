'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Mic, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, type Lang } from '@/lib/i18n/messages';
import { navPath } from '@/lib/i18n/paths';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
}

const HIDDEN_ROUTES = [
  '/auth',
  '/onboarding',
  '/jogo/novo', // recorder takes full screen
  '/game/new',
  '/i/',
  '/terms',
  '/privacy',
  '/cookies',
];

interface BottomNavProps {
  signedIn: boolean;
  lang: Lang;
}

export function BottomNav({ signedIn, lang }: BottomNavProps) {
  const path = usePathname();

  // Don't show until user is signed in.
  if (!signedIn) return null;
  if (HIDDEN_ROUTES.some((r) => path?.startsWith(r))) return null;

  const items: NavItem[] = [
    {
      href: navPath.home(),
      label: t(lang, 'nav.home'),
      icon: Home,
      match: (p) => p === '/home' || p === '/',
    },
    {
      href: navPath.daily(),
      label: t(lang, 'nav.daily'),
      icon: Calendar,
      match: (p) => p.startsWith('/challenge') || p.startsWith('/qotd') || p.startsWith('/daily'),
    },
    {
      href: navPath.detector(lang),
      label: t(lang, 'nav.detector'),
      icon: Mic,
      match: (p) => p.startsWith('/jogo') || p.startsWith('/game') || p.startsWith('/detector'),
    },
    {
      href: navPath.friends(lang),
      label: t(lang, 'nav.friends'),
      icon: Users,
      match: (p) => p.startsWith('/amigos') || p.startsWith('/friends') || p === '/leaderboard',
    },
    {
      href: navPath.profile(),
      label: t(lang, 'nav.profile'),
      icon: User,
      match: (p) => p.startsWith('/settings') || p.startsWith('/perfil') || p.startsWith('/profile'),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-md border-t-2 border-line"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {items.map((item) => {
          const active = item.match(path ?? '');
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-3 min-h-[48px] transition-colors',
                  active ? 'text-mustard' : 'text-fg-muted hover:text-fg'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
                <span className="font-mono text-[9px] tracking-widest uppercase">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" aria-hidden="true" />
    </nav>
  );
}

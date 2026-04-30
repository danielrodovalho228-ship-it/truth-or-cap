'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Mic, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
}

const ITEMS: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home, match: (p) => p === '/home' || p === '/' },
  { href: '/challenge', label: 'Daily', icon: Calendar, match: (p) => p.startsWith('/challenge') || p.startsWith('/qotd') },
  { href: '/game/select', label: 'Detector', icon: Mic, match: (p) => p.startsWith('/game') },
  { href: '/friends', label: 'Friends', icon: Users, match: (p) => p.startsWith('/friends') || p === '/leaderboard' },
  { href: '/settings', label: 'Profile', icon: User, match: (p) => p.startsWith('/settings') || p.startsWith('/perfil') },
];

const HIDDEN_ROUTES = [
  '/auth',
  '/onboarding',
  '/game/new', // recorder takes full screen
  '/i/',
  '/terms',
  '/privacy',
  '/cookies',
];

interface BottomNavProps {
  signedIn: boolean;
}

export function BottomNav({ signedIn }: BottomNavProps) {
  const path = usePathname();

  // Don't show until user is signed in.
  if (!signedIn) return null;
  if (HIDDEN_ROUTES.some((r) => path?.startsWith(r))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-md border-t-2 border-line"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {ITEMS.map((item) => {
          const active = item.match(path ?? '');
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 transition-colors',
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

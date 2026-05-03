import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { isAdminAsync } from '@/lib/admin';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/admin');
  const allowed = await isAdminAsync(user.id);
  if (!allowed) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-rose-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-pink-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-2 md:gap-6">
          <Link href="/admin" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white font-display font-black text-base group-hover:scale-105 transition-transform">T</div>
            <span className="hidden md:inline font-display text-lg font-black text-violet-900">Admin</span>
          </Link>

          <nav className="flex items-center gap-1 md:gap-2 text-sm flex-1 overflow-x-auto">
            <NavLink href="/admin" label="Dashboard" />
            <NavLink href="/admin/users" label="Users" />
            <NavLink href="/admin/rooms" label="Rooms" />
            <NavLink href="/admin/costs" label="Costs" />
            <NavLink href="/admin/audit" label="Audit" />
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60">Admin</p>
              <p className="text-xs text-violet-900 font-medium truncate max-w-[180px]">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white font-display font-black text-base shadow-md">
              {(user.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <Link href="/" className="font-mono text-[10px] tracking-widest uppercase text-violet-700/60 hover:text-violet-900 hidden md:inline">
              ← App
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="max-w-6xl mx-auto px-6 py-8 mt-12 border-t border-pink-200/50 text-center">
        <p className="font-mono text-[10px] tracking-widest uppercase text-violet-700/40">
          Truth or Cap · Admin Console · v1.0
        </p>
      </footer>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-violet-700 hover:bg-pink-100 hover:text-violet-900 font-medium transition-colors whitespace-nowrap"
    >
      {label}
    </Link>
  );
}

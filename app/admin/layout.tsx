import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { isAdminAsync } from '@/lib/admin';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/admin');
  const allowed = await isAdminAsync(user.id);
  if (!allowed) {
    // Generic redirect — no leaking that admin exists.
    redirect('/');
  }
  return (
    <>
      <div className="bg-violet-900 text-white">
        <nav className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6 text-sm flex-wrap">
          <Link href="/admin" className="font-bold">Truth or Cap · Admin</Link>
          <Link href="/admin" className="hover:underline opacity-80">Dashboard</Link>
          <Link href="/admin/users" className="hover:underline opacity-80">Users</Link>
          <Link href="/admin/rooms" className="hover:underline opacity-80">Rooms</Link>
          <Link href="/admin/costs" className="hover:underline opacity-80">Costs</Link>
          <span className="ml-auto opacity-60">{user.email}</span>
        </nav>
      </div>
      {children}
    </>
  );
}

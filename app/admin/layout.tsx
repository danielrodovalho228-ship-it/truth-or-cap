import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { isAdmin } from '@/lib/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/admin');
  if (!isAdmin(user.id)) notFound();
  return <>{children}</>;
}

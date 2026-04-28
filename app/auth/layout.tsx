import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // If already signed in, bounce away from auth pages.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect('/');

  return <>{children}</>;
}

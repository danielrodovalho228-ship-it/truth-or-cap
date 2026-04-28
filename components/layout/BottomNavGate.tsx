import { createClient } from '@/lib/supabase/server';
import { BottomNav } from './BottomNav';

/** Server-side wrapper: detects auth state once, then renders the client nav. */
export async function BottomNavGate() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return <BottomNav signedIn={!!data.user} />;
}

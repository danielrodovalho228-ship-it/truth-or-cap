import { createClient } from '@/lib/supabase/server';
import { getLang } from '@/lib/i18n/server';
import { BottomNav } from './BottomNav';

/** Server-side wrapper: detects auth state once, then renders the client nav. */
export async function BottomNavGate() {
  const supabase = await createClient();
  const [{ data }, lang] = await Promise.all([supabase.auth.getUser(), getLang()]);
  return <BottomNav signedIn={!!data.user} lang={lang} />;
}

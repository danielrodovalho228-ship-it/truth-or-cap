import { OnlineLobby } from './OnlineLobby';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Online Room - Truth or Cap',
};

export default async function OnlinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isPremium = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, premium_until')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.is_premium) {
      const stillActive =
        !profile.premium_until || new Date(profile.premium_until) >= new Date();
      isPremium = stillActive;
    }
  }

  const spicyAllowed = isPremium || process.env.ALLOW_SPICY_FOR_ALL === '1';

  return <OnlineLobby spicyAllowed={spicyAllowed} />;
}

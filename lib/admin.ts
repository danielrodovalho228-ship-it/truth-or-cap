import { createServiceRoleClient } from '@/lib/supabase/server';

// Source of truth: profiles.is_admin / profiles.is_allowed in Supabase.
// No env-based admin bypass. is_allowed gate is opt-in via CLOSED_BETA env.

export async function isAdminAsync(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[admin] is_admin lookup failed', error);
      return false;
    }
    return data?.is_admin === true;
  } catch (e) {
    console.error('[admin] is_admin threw', e);
    return false;
  }
}

// Closed beta gate: when CLOSED_BETA=true, only profiles.is_allowed=true
// users can use the app. Admins are always allowed. Default is OPEN
// (everyone allowed) so launch isn't accidentally gated.
export async function isAllowedAsync(userId: string | null | undefined): Promise<boolean> {
  const closedBeta = (process.env.CLOSED_BETA ?? 'false').toLowerCase() === 'true';
  if (!closedBeta) return true;
  if (!userId) return false;
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('profiles')
      .select('is_admin, is_allowed')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[admin] is_allowed lookup failed', error);
      return false;
    }
    if (!data) return false;
    return data.is_admin === true || data.is_allowed === true;
  } catch (e) {
    console.error('[admin] is_allowed threw', e);
    return false;
  }
}

// Premium gate: check profiles.is_premium AND premium_until > now (if set).
// Used by /api/room/create for spicy gate, premium-only features, etc.
export async function isPremiumAsync(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('profiles')
      .select('is_premium, premium_until')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[admin] is_premium lookup failed', error);
      return false;
    }
    if (!data || !data.is_premium) return false;
    if (data.premium_until && new Date(data.premium_until) < new Date()) return false;
    return true;
  } catch (e) {
    console.error('[admin] is_premium threw', e);
    return false;
  }
}

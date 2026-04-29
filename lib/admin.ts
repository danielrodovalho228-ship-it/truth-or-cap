import { createServiceRoleClient } from '@/lib/supabase/server';

export async function isAdminAsync(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  // Fallback to env list during early bootstrap to avoid lockout.
  const fallback = (process.env.ADMIN_FALLBACK_IDS ?? 'cd5b78fd-4e6e-4124-ae06-f5fc82ffef46')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fallback.includes(userId)) return true;
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

// Synchronous shim used by client components — relies on hardcoded list.
export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const HARDCODED = ['cd5b78fd-4e6e-4124-ae06-f5fc82ffef46'];
  return HARDCODED.includes(userId);
}

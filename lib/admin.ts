// Admin user IDs — replace with your own UUID(s).
// Find yours in Supabase Dashboard → Authentication → Users → click your row.

export const ADMIN_USER_IDS: ReadonlyArray<string> = [
  'cd5b78fd-4e6e-4124-ae06-f5fc82ffef46', // Daniel (@drodoval)
];

export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

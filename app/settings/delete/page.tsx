import type { Metadata } from 'next';
import { requireProfile } from '@/lib/auth/guard';
import { DeleteAccountClient } from './DeleteAccountClient';

export const metadata: Metadata = {
  title: 'Delete account · Truth or Cap',
  robots: { index: false },
};

export default async function DeleteAccountPage() {
  const { profile } = await requireProfile('/settings/delete');
  return <DeleteAccountClient username={profile.username} />;
}

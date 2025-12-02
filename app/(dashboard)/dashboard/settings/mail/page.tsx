import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import MailSettingsClient from './MailSettingsClient';

export default async function MailSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only admins can access mail settings
  if (!['system_admin', 'group_admin'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <MailSettingsClient />;
}



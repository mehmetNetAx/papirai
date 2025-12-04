import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import LoggingSettingsClient from './LoggingSettingsClient';

export default async function LoggingSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only system admin can access logging settings
  if (session.user.role !== 'system_admin') {
    redirect('/dashboard');
  }

  return <LoggingSettingsClient />;
}



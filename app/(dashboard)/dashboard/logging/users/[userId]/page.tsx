import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import UserActivityLogsClient from './UserActivityLogsClient';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserActivityLogsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { userId } = await params;

  // Only system admin or the user themselves can view logs
  if (session.user.role !== 'system_admin' && session.user.id !== userId) {
    redirect('/dashboard');
  }

  return <UserActivityLogsClient userId={userId} currentUserId={session.user.id} currentUserRole={session.user.role} />;
}



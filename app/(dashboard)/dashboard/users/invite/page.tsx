import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import InviteUserForm from './InviteUserForm';

export default async function InviteUserPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only admins can invite users
  const isAdmin = ['system_admin', 'group_admin', 'company_admin'].includes(session.user.role);
  if (!isAdmin) {
    redirect('/dashboard/users');
  }

  return <InviteUserForm />;
}


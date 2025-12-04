import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/dashboard/DashboardNav';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ActivityLogger from '@/components/dashboard/ActivityLogger';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ActivityLogger />
      <DashboardHeader user={session.user} />
      <div className="flex flex-1">
        <DashboardNav user={session.user} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}


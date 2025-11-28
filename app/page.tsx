import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import MarketingPage from './(marketing)/page';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }

  // Show marketing page for unauthenticated users
  return <MarketingPage />;
}


import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import LandingPage from './landing-page';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }

  // Show landing page for unauthenticated users
  return <LandingPage />;
}

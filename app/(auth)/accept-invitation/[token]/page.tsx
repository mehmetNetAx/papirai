import { redirect } from 'next/navigation';
import AcceptInvitationClient from './AcceptInvitationClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitationPage({ params }: PageProps) {
  const { token } = await params;
  return <AcceptInvitationClient token={token} />;
}


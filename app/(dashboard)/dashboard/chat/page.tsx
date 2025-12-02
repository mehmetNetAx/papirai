import { redirect } from 'next/navigation';

export default async function ChatPage() {
  // Redirect to dashboard - chat page removed, use contract-specific chat instead
  redirect('/dashboard');
}


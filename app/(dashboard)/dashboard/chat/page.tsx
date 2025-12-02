import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import GeneralChatBot from '@/components/chat/GeneralChatBot';
import HelpButton from '@/components/help/HelpButton';

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">
                AI Asistan
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
                Tüm sözleşmeler hakkında sorular sorun, özetler alın ve bilgi edinin
              </p>
            </div>
            <HelpButton module="chat" />
          </div>
        </div>

        {/* Chat Bot */}
        <GeneralChatBot />
      </div>
    </div>
  );
}


'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date | string;
  className?: string;
}

export default function ChatMessage({ role, content, timestamp, className }: ChatMessageProps) {
  const isUser = role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isUser
          ? 'bg-primary/10 dark:bg-primary/20 ml-auto max-w-[80%]'
          : 'bg-gray-100 dark:bg-gray-800 mr-auto max-w-[80%]',
        className
      )}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <span className="material-symbols-outlined text-primary">person</span>
        ) : (
          <span className="material-symbols-outlined text-blue-500">smart_toy</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isUser ? 'Sen' : 'AI Asistan'}
          </span>
          {timestamp && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {format(new Date(timestamp), 'HH:mm', { locale: tr })}
            </span>
          )}
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert text-gray-800 dark:text-gray-200">
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          )}
        </div>
        {!isUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="mt-2 h-7 text-xs"
          >
            <span className="material-symbols-outlined text-sm mr-1">content_copy</span>
            Kopyala
          </Button>
        )}
      </div>
    </div>
  );
}


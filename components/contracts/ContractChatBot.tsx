'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ChatMessage from '@/components/chat/ChatMessage';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ContractChatBotProps {
  contractId: string;
  className?: string;
}

export default function ContractChatBot({ contractId, className }: ContractChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate session ID
    const newSessionId = `contract-${contractId}-${Date.now()}`;
    setSessionId(newSessionId);
    loadChatHistory(newSessionId);
  }, [contractId]);

  // Initialize chat with welcome message on first load (if no history exists)
  useEffect(() => {
    if (sessionId && messages.length === 0) {
      initializeChatWithContract();
    }
  }, [sessionId, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/chat?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to load chat history');
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(
          data.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp || Date.now()),
          }))
        );
      }
    } catch (err: any) {
      console.error('Error loading chat history:', err);
      // Don't show error for empty history
    }
  };

  const initializeChatWithContract = async () => {
    // Show welcome message
    const welcomeMessage: Message = {
      role: 'assistant',
      content: 'Merhaba! Bu sözleşme hakkında sorularınızı yanıtlamaya hazırım. İstediğiniz soruyu sorabilirsiniz.\n\nÖrnek sorular:\n- Bu sözleşmenin özeti nedir?\n- Ödeme koşulları nelerdir?\n- Tarafların yükümlülükleri nelerdir?\n- Sözleşme ne zaman sona eriyor?',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Bir hata oluştu');
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/contracts/${contractId}/chat?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages([]);
        setError(null);
      }
    } catch (err) {
      console.error('Error clearing chat:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className={cn('border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">chat</span>
            Sözleşme AI Asistanı
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <span className="material-symbols-outlined text-sm mr-1">delete</span>
              Temizle
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 block animate-pulse">chat_bubble_outline</span>
                <p>Sözleşme yükleniyor...</p>
              </div>
            )}
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <span className="material-symbols-outlined animate-spin">sync</span>
                <span>Yanıt oluşturuluyor...</span>
              </div>
            )}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Soru sorun..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
              >
                <span className="material-symbols-outlined">send</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


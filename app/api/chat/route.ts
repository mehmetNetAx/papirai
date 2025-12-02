import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import { generateChatResponse, getChatHistory, deleteChatHistory } from '@/lib/services/ai/chat';

// POST - Send a message to general chat bot (searches across all contracts)
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { message, sessionId } = body;

      if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
      }

      // Generate session ID if not provided
      const finalSessionId = sessionId || `general-${user.id}-${Date.now()}`;

      // Generate chat response (without specific contractId for general chat)
      const response = await generateChatResponse({
        userId: user.id,
        sessionId: finalSessionId,
        message,
      });

      return NextResponse.json(response, { status: 200 });
    } catch (error: any) {
      console.error('Error in general chat:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate chat response' },
        { status: 500 }
      );
    }
  })(req);
}

// GET - Get general chat history
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const sessionId = searchParams.get('sessionId');

      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
      }

      const history = await getChatHistory(sessionId);

      return NextResponse.json({ messages: history }, { status: 200 });
    } catch (error: any) {
      console.error('Error getting chat history:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get chat history' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete general chat history
export async function DELETE(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const sessionId = searchParams.get('sessionId');

      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
      }

      await deleteChatHistory(sessionId);

      return NextResponse.json({ message: 'Chat history deleted' }, { status: 200 });
    } catch (error: any) {
      console.error('Error deleting chat history:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete chat history' },
        { status: 500 }
      );
    }
  })(req);
}


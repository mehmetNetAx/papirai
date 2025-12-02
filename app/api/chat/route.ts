import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import { generateChatResponse, getChatHistory, deleteChatHistory } from '@/lib/services/ai/chat';
import { vectorSearch, fallbackVectorSearch } from '@/lib/services/rag/vector-search';
import Contract from '@/lib/db/models/Contract';
import mongoose from 'mongoose';

// POST - Send a message to general chat bot (searches across all contracts)
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { message, sessionId, useRAG } = body;

      if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
      }

      // Generate session ID if not provided
      const finalSessionId = sessionId || `general-${user.id}-${Date.now()}`;

      // If RAG is enabled, search across all accessible contracts
      let relevantContracts: Array<{ contractId: string; title: string; score?: number }> = [];
      
      if (useRAG !== false) {
        try {
          // Search across all contracts (no contractId filter)
          let searchResults;
          try {
            searchResults = await vectorSearch(message);
          } catch (error) {
            console.warn('Vector search failed, using fallback:', error);
            searchResults = await fallbackVectorSearch(message);
          }

          // Get unique contract IDs and their scores
          const contractMap = new Map<string, { title: string; score: number }>();
          
          for (const result of searchResults) {
            if (!contractMap.has(result.contractId)) {
              const contract = await Contract.findById(result.contractId)
                .select('title companyId')
                .lean();
              
              if (contract) {
                // Check access
                const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
                if (user.role === 'system_admin' || contract.companyId.toString() === companyObjectId.toString()) {
                  contractMap.set(result.contractId, {
                    title: contract.title,
                    score: result.score || 0,
                  });
                }
              }
            }
          }

          relevantContracts = Array.from(contractMap.entries()).map(([contractId, data]) => ({
            contractId,
            title: data.title,
            score: data.score,
          }));

          // Sort by score
          relevantContracts.sort((a, b) => (b.score || 0) - (a.score || 0));
        } catch (error) {
          console.error('Error searching contracts:', error);
          // Continue without RAG if search fails
        }
      }

      // Generate chat response (without specific contractId for general chat)
      const response = await generateChatResponse({
        userId: user.id,
        sessionId: finalSessionId,
        message: relevantContracts.length > 0
          ? `${message}\n\nNot: Aşağıdaki sözleşmeler sorunuzla ilgili görünüyor: ${relevantContracts.slice(0, 5).map(c => c.title).join(', ')}`
          : message,
        useRAG: false, // Don't use RAG for general chat (we already searched)
      });

      return NextResponse.json({
        ...response,
        relevantContracts: relevantContracts.slice(0, 5), // Return top 5
      }, { status: 200 });
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


import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { generateChatResponse, getChatHistory, deleteChatHistory } from '@/lib/services/ai/chat';
import mongoose from 'mongoose';

// POST - Send a message and get AI response
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: contractId } = await params;
      await connectDB();

      // Verify contract exists and user has access
      const contractObjectId = new mongoose.Types.ObjectId(contractId);
      const contract = await Contract.findById(contractObjectId).lean();

      if (!contract) {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      }

      // Check access
      const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
      if (user.role !== 'system_admin' && contract.companyId.toString() !== companyObjectId.toString()) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const body = await req.json();
      const { message, sessionId } = body;

      console.log(`[API Chat] ===== START: Chat request for contract ${contractId} =====`);
      console.log(`[API Chat] User: ${user.id}, Message: ${message.substring(0, 100)}...`);
      console.log(`[API Chat] Contract found: ${contract.title || 'No title'}`);
      console.log(`[API Chat] Contract content exists: ${!!contract.content}`);
      console.log(`[API Chat] Contract content type: ${typeof contract.content}`);
      console.log(`[API Chat] Contract content length: ${contract.content?.length || 0} characters`);
      if (contract.content) {
        console.log(`[API Chat] Contract content preview (first 500 chars): ${contract.content.substring(0, 500)}...`);
      }

      if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
      }

      // Generate session ID if not provided
      const finalSessionId = sessionId || `contract-${contractId}-${user.id}-${Date.now()}`;
      console.log(`[API Chat] Session ID: ${finalSessionId}`);

      // Generate chat response
      console.log(`[API Chat] Calling generateChatResponse...`);
      const response = await generateChatResponse({
        contractId,
        userId: user.id,
        sessionId: finalSessionId,
        message,
      });
      console.log(`[API Chat] ✓ Chat response generated successfully`);
      console.log(`[API Chat] ===== END: Chat request =====`);

      return NextResponse.json(response, { status: 200 });
    } catch (error: any) {
      console.error('Error in contract chat:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate chat response' },
        { status: 500 }
      );
    }
  })(req);
}

// GET - Get chat history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: contractId } = await params;
      await connectDB();

      // Verify contract exists and user has access
      const contractObjectId = new mongoose.Types.ObjectId(contractId);
      const contract = await Contract.findById(contractObjectId).lean();

      if (!contract) {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      }

      // Check access
      const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
      if (user.role !== 'system_admin' && contract.companyId.toString() !== companyObjectId.toString()) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

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

// DELETE - Delete chat history
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: contractId } = await params;
      await connectDB();

      // Verify contract exists and user has access
      const contractObjectId = new mongoose.Types.ObjectId(contractId);
      const contract = await Contract.findById(contractObjectId).lean();

      if (!contract) {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      }

      // Check access
      const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
      if (user.role !== 'system_admin' && contract.companyId.toString() !== companyObjectId.toString()) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

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


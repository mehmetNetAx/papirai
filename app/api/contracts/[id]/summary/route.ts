import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractSummary from '@/lib/db/models/ContractSummary';
import { getAIProvider } from '@/lib/services/ai/factory';
import { htmlToText } from '@/lib/services/rag/chunker';
import mongoose from 'mongoose';

// GET - Get contract summary
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

      // Get latest summary (prefer manual, then auto)
      const summary = await ContractSummary.findOne({
        contractId: contractObjectId,
      })
        .sort({ summaryType: -1, createdAt: -1 }) // Manual first, then by date
        .lean();

      if (!summary) {
        return NextResponse.json({ summary: null }, { status: 200 });
      }

      return NextResponse.json({
        summary: {
          _id: summary._id.toString(),
          summaryType: summary.summaryType,
          summary: summary.summary,
          model: summary.model,
          generatedBy: summary.generatedBy === 'system' ? 'system' : summary.generatedBy.toString(),
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        },
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error getting contract summary:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get summary' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Generate new summary
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
      const { summaryType = 'manual', maxLength = 500, focus } = body;

      // Convert HTML to text
      const plainText = htmlToText(contract.content);

      if (!plainText || plainText.trim().length === 0) {
        return NextResponse.json({ error: 'Contract content is empty' }, { status: 400 });
      }

      // Generate summary using AI
      const provider = getAIProvider();
      const summaryResponse = await provider.generateSummary({
        content: plainText,
        maxLength,
        focus: focus ? (Array.isArray(focus) ? focus : [focus]) : undefined,
      });

      // Save summary to database
      const summary = await ContractSummary.findOneAndUpdate(
        {
          contractId: contractObjectId,
          summaryType,
        },
        {
          contractId: contractObjectId,
          summaryType,
          summary: summaryResponse.summary,
          generatedBy: user.id,
          model: summaryResponse.model,
          metadata: {
            tokenCount: summaryResponse.usage?.totalTokens,
            maxLength,
            focus,
          },
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({
        summary: {
          _id: summary._id.toString(),
          summaryType: summary.summaryType,
          summary: summary.summary,
          model: summary.model,
          generatedBy: summary.generatedBy.toString(),
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        },
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error generating contract summary:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate summary' },
        { status: 500 }
      );
    }
  })(req);
}


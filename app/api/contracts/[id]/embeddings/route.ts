import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { generateContractEmbeddings, hasContractEmbeddings, getContractEmbeddingCount } from '@/lib/services/ai/embedding';
import mongoose from 'mongoose';

// POST - Generate/update embeddings for a contract
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

      // Check access (admin or contract owner)
      const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
      if (user.role !== 'system_admin' && contract.companyId.toString() !== companyObjectId.toString()) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Generate embeddings
      const result = await generateContractEmbeddings(contractId);

      return NextResponse.json({
        success: true,
        ...result,
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error generating embeddings:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate embeddings' },
        { status: 500 }
      );
    }
  })(req);
}

// GET - Check embedding status
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

      const hasEmbeddings = await hasContractEmbeddings(contractId);
      const count = hasEmbeddings ? await getContractEmbeddingCount(contractId) : 0;

      return NextResponse.json({
        hasEmbeddings,
        count,
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error checking embeddings:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to check embeddings' },
        { status: 500 }
      );
    }
  })(req);
}


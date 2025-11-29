import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Signature from '@/lib/db/models/Signature';
import { requireAuth } from '@/lib/auth/middleware';
import { createSignatureRequest, uploadPhysicalSignature } from '@/lib/services/signature';

// GET - List signatures
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const contractId = searchParams.get('contractId');

      let query: any = {};

      if (contractId) {
        query.contractId = contractId;
      } else if (user.role === 'system_admin') {
        // System admin sees all signatures
        // No filter needed
      } else {
        // Get user's signatures
        query.signerId = user.id;
      }

      const signatures = await Signature.find(query)
        .populate('contractId', 'title')
        .populate('signerId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({ signatures });
    } catch (error) {
      console.error('Error fetching signatures:', error);
      return NextResponse.json(
        { error: 'Failed to fetch signatures' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Create signature request
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { contractId, signers } = body;

      if (!contractId || !signers || !Array.isArray(signers)) {
        return NextResponse.json(
          { error: 'Contract ID and signers are required' },
          { status: 400 }
        );
      }

      const signatureId = await createSignatureRequest(contractId, signers);

      return NextResponse.json({ signatureId }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating signature request:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create signature request' },
        { status: 500 }
      );
    }
  })(req);
}


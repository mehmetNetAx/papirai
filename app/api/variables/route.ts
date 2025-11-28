import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import ContractVariable from '@/lib/db/models/ContractVariable';
import Contract from '@/lib/db/models/Contract';
import { requireAuth } from '@/lib/auth/middleware';
import { variableSchema } from '@/lib/utils/validation';
import { canEditContract } from '@/lib/utils/permissions';

// GET - List variables for a contract
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const contractId = searchParams.get('contractId');

      if (!contractId) {
        return NextResponse.json(
          { error: 'Contract ID is required' },
          { status: 400 }
        );
      }

      const contract = await Contract.findById(contractId);
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check access based on role
      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const variables = await ContractVariable.find({ contractId }).sort({ createdAt: -1 }).lean();

      return NextResponse.json({ variables });
    } catch (error) {
      console.error('Error fetching variables:', error);
      return NextResponse.json(
        { error: 'Failed to fetch variables' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Create variable
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const validatedData = variableSchema.parse(body);
      const contractId = validatedData.contractId || body.contractId;

      if (!contractId) {
        return NextResponse.json(
          { error: 'Contract ID is required' },
          { status: 400 }
        );
      }

      const contract = await Contract.findById(contractId);
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      if (!canEditContract(user, contract.companyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const variable = await ContractVariable.create({
        ...validatedData,
        contractId: contract._id,
      });

      return NextResponse.json({ variable }, { status: 201 });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      console.error('Error creating variable:', error);
      return NextResponse.json(
        { error: 'Failed to create variable' },
        { status: 500 }
      );
    }
  })(req);
}


import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import ContractVariable from '@/lib/db/models/ContractVariable';
import GlobalVariable from '@/lib/db/models/GlobalVariable';
import Contract from '@/lib/db/models/Contract';
import { requireAuth } from '@/lib/auth/middleware';
import { canEditContract } from '@/lib/utils/permissions';

import { variableSchema } from '@/lib/utils/validation';

// POST - Create a new variable for a contract OR add a global variable to a contract
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const body = await req.json();
      const { globalVariableId, value, name, type, taggedText, isComplianceTracked } = body;

      const contract = await Contract.findById(id);
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // If globalVariableId is provided, add global variable to contract
      if (globalVariableId) {
        const globalVar = await GlobalVariable.findById(globalVariableId);
        if (!globalVar || !globalVar.isActive) {
          return NextResponse.json(
            { error: 'Global variable not found' },
            { status: 404 }
          );
        }

        // Check if variable already exists in contract
        const existing = await ContractVariable.findOne({
          contractId: id,
          name: globalVar.name,
        });

        if (existing) {
          return NextResponse.json(
            { error: 'This variable already exists in the contract' },
            { status: 409 }
          );
        }

        // Create contract variable from global variable
        const contractVariable = await ContractVariable.create({
          contractId: contract._id,
          name: globalVar.name,
          type: globalVar.type,
          value: value || globalVar.defaultValue || '',
          taggedText: `{{${globalVar.name}}}`,
          isComplianceTracked: false,
          metadata: globalVar.metadata,
        });

        return NextResponse.json({ variable: contractVariable }, { status: 201 });
      }

      // Otherwise, create a new variable for the contract
      if (!name || !type) {
        return NextResponse.json(
          { error: 'Variable name and type are required' },
          { status: 400 }
        );
      }

      // Validate variable data
      const validatedData = variableSchema.parse({
        name,
        type,
        value: value || '',
        taggedText: taggedText || `{{${name}}}`,
        isComplianceTracked: isComplianceTracked || false,
      });

      // Check if variable already exists in contract
      const existing = await ContractVariable.findOne({
        contractId: id,
        name: validatedData.name,
      });

      if (existing) {
        return NextResponse.json(
          { error: 'This variable already exists in the contract' },
          { status: 409 }
        );
      }

      // Create new contract variable
      const contractVariable = await ContractVariable.create({
        contractId: contract._id,
        ...validatedData,
      });

      return NextResponse.json({ variable: contractVariable }, { status: 201 });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      console.error('Error creating/adding variable to contract:', error);
      return NextResponse.json(
        { error: 'Failed to create/add variable to contract' },
        { status: 500 }
      );
    }
  })(req);
}


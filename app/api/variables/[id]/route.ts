import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import ContractVariable from '@/lib/db/models/ContractVariable';
import Contract from '@/lib/db/models/Contract';
import { requireAuth } from '@/lib/auth/middleware';
import { variableSchema } from '@/lib/utils/validation';
import { canEditContract } from '@/lib/utils/permissions';

// PATCH - Update variable
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const body = await req.json();
      const { type, value, isComplianceTracked, isMaster, masterType } = body;

      const variable = await ContractVariable.findById(id);
      if (!variable) {
        return NextResponse.json(
          { error: 'Variable not found' },
          { status: 404 }
        );
      }

      // Get contract to check permissions
      const contract = await Contract.findById(variable.contractId);
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

      // Update variable (name cannot be changed)
      const updateData: any = {};
      if (type !== undefined) updateData.type = type;
      if (value !== undefined) updateData.value = value;
      if (isComplianceTracked !== undefined) updateData.isComplianceTracked = isComplianceTracked;
      if (isMaster !== undefined) updateData.isMaster = isMaster;
      if (masterType !== undefined) {
        if (isMaster && !masterType) {
          return NextResponse.json(
            { error: 'masterType is required when isMaster is true' },
            { status: 400 }
          );
        }
        if (masterType && !['endDate', 'startDate', 'terminationPeriod', 'terminationDeadline', 'contractValue', 'currency', 'renewalDate', 'counterparty', 'contractType', 'other'].includes(masterType)) {
          return NextResponse.json(
            { error: 'Invalid masterType' },
            { status: 400 }
          );
        }
        updateData.masterType = masterType || undefined;
      }

      // If setting as master, ensure only one master variable of this type per contract
      if (isMaster && masterType) {
        const existingMaster = await ContractVariable.findOne({
          contractId: variable.contractId,
          isMaster: true,
          masterType: masterType,
          _id: { $ne: id },
        });

        if (existingMaster) {
          return NextResponse.json(
            { error: `A master variable of type ${masterType} already exists for this contract` },
            { status: 409 }
          );
        }
      }

      const updatedVariable = await ContractVariable.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      // If master variable was updated, sync to contract model
      if (isMaster !== undefined || masterType !== undefined || value !== undefined) {
        const { syncMasterVariablesToContract } = await import('@/lib/services/master-variables');
        await syncMasterVariablesToContract(variable.contractId.toString());
      }

      return NextResponse.json({ variable: updatedVariable });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      console.error('Error updating variable:', error);
      return NextResponse.json(
        { error: 'Failed to update variable' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete variable
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const variable = await ContractVariable.findById(id);
      if (!variable) {
        return NextResponse.json(
          { error: 'Variable not found' },
          { status: 404 }
        );
      }

      // Get contract to check permissions
      const contract = await Contract.findById(variable.contractId);
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

      await ContractVariable.findByIdAndDelete(id);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting variable:', error);
      return NextResponse.json(
        { error: 'Failed to delete variable' },
        { status: 500 }
      );
    }
  })(req);
}


import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import ContractVariable from '@/lib/db/models/ContractVariable';
import { requireAuth } from '@/lib/auth/middleware';
import mongoose from 'mongoose';

// POST - Update a specific variable by ID to be a master variable
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { variableId, masterType } = body;

      if (!variableId || !masterType) {
        return NextResponse.json(
          { error: 'variableId and masterType are required' },
          { status: 400 }
        );
      }

      await connectDB();

      const variableObjectId = new mongoose.Types.ObjectId(variableId);
      const contractObjectId = new mongoose.Types.ObjectId(id);

      // Find the variable first
      const variable = await ContractVariable.findById(variableObjectId).lean();
      if (!variable) {
        return NextResponse.json(
          { error: 'Variable not found' },
          { status: 404 }
        );
      }

      // Verify it belongs to this contract
      if (variable.contractId.toString() !== contractObjectId.toString()) {
        return NextResponse.json(
          { error: 'Variable does not belong to this contract' },
          { status: 403 }
        );
      }

      console.log('Updating variable:', {
        _id: variable._id,
        name: variable.name,
        currentIsMaster: variable.isMaster,
        currentMasterType: variable.masterType,
        newMasterType: masterType,
      });

      // Update the variable
      const result = await ContractVariable.findByIdAndUpdate(
        variableObjectId,
        {
          $set: {
            isMaster: true,
            masterType: masterType,
          },
        },
        { new: true }
      );

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to update variable' },
          { status: 500 }
        );
      }

      // Verify the update
      const verify = await ContractVariable.findById(variableObjectId).lean();
      console.log('Updated variable (verified):', {
        _id: verify?._id,
        name: verify?.name,
        isMaster: verify?.isMaster,
        masterType: verify?.masterType,
      });

      return NextResponse.json({
        success: true,
        variable: {
          _id: result._id.toString(),
          name: result.name,
          isMaster: result.isMaster,
          masterType: result.masterType,
        },
      });
    } catch (error: any) {
      console.error('Error updating variable by ID:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update variable' },
        { status: 500 }
      );
    }
  })(req);
}


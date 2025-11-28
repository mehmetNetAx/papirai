import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVariable, { MasterVariableType } from '@/lib/db/models/ContractVariable';
import { requireAuth } from '@/lib/auth/middleware';
import { canEditContract } from '@/lib/utils/permissions';
import {
  getMasterVariables,
  setMasterVariable,
  syncMasterVariablesToContract,
} from '@/lib/services/master-variables';
import mongoose from 'mongoose';

// GET - Get all master variables for a contract
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contract = await Contract.findById(id);
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Ensure contractId is ObjectId
      const contractObjectId = new mongoose.Types.ObjectId(id);
      const masterVars = await getMasterVariables(id);
      
      // Find master variables - also include those with masterType even if isMaster is missing
      const masterVariables = await ContractVariable.find({
        contractId: contractObjectId,
        $or: [
          { isMaster: true },
          { masterType: { $exists: true, $ne: null } },
        ],
      }).lean();

      return NextResponse.json({
        masterVariables: masterVariables.map(v => ({
          _id: v._id.toString(),
          name: v.name,
          value: v.value,
          type: v.type,
          masterType: v.masterType,
          isMaster: v.isMaster !== undefined ? v.isMaster : true,
          metadata: v.metadata,
        })),
        computed: masterVars,
      });
    } catch (error: any) {
      console.error('Error fetching master variables:', error);
      return NextResponse.json(
        { error: 'Failed to fetch master variables' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Set a master variable or multiple master variables
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const body = await req.json();
      
      // Check if this is a bulk update (multiple master variables at once)
      if (body.startDate !== undefined || body.endDate !== undefined || body.contractType !== undefined || 
          body.counterparty !== undefined || body.currency !== undefined || body.contractValue !== undefined) {
        // Bulk update mode
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

        // Update all provided master variables
        const updates: Array<{ masterType: MasterVariableType; value: string | number | Date; name: string }> = [];

        if (body.startDate) {
          updates.push({
            masterType: 'startDate',
            value: new Date(body.startDate),
            name: 'Başlangıç Tarihi',
          });
        }

        if (body.endDate) {
          updates.push({
            masterType: 'endDate',
            value: new Date(body.endDate),
            name: 'Bitiş Tarihi',
          });
        }

        if (body.contractType) {
          updates.push({
            masterType: 'contractType',
            value: body.contractType,
            name: 'Sözleşme Tipi',
          });
        }

        if (body.counterparty) {
          updates.push({
            masterType: 'counterparty',
            value: body.counterparty,
            name: 'Karşı Taraf',
          });
        }

        if (body.currency) {
          updates.push({
            masterType: 'currency',
            value: body.currency,
            name: 'Para Birimi',
          });
        }

        if (body.contractValue !== undefined) {
          updates.push({
            masterType: 'contractValue',
            value: typeof body.contractValue === 'number' ? body.contractValue : parseFloat(body.contractValue),
            name: 'Sözleşme Tutarı',
          });
        }

        // Set all master variables
        for (const update of updates) {
          await setMasterVariable(id, update.masterType, update.value, update.name);
        }

        // Sync to contract model
        await syncMasterVariablesToContract(id);

        // Get updated master variables
        const contractObjectId = new mongoose.Types.ObjectId(id);
        const masterVars = await getMasterVariables(id);
        
        const masterVariables = await ContractVariable.find({
          contractId: contractObjectId,
          $or: [
            { isMaster: true },
            { masterType: { $exists: true, $ne: null } },
          ],
        }).lean();

        return NextResponse.json({
          success: true,
          masterVariables: masterVariables.map(v => ({
            _id: v._id.toString(),
            name: v.name,
            value: v.value,
            type: v.type,
            masterType: v.masterType,
            isMaster: v.isMaster !== undefined ? v.isMaster : true,
            metadata: v.metadata,
          })),
          computed: masterVars,
        });
      } else {
        // Single master variable update (original behavior)
        const { masterType, value, name } = body;

        if (!masterType) {
          return NextResponse.json(
            { error: 'masterType is required' },
            { status: 400 }
          );
        }

        if (!['endDate', 'startDate', 'terminationPeriod', 'terminationDeadline', 'contractValue', 'currency', 'renewalDate', 'counterparty', 'contractType', 'other'].includes(masterType)) {
          return NextResponse.json(
            { error: 'Invalid masterType' },
            { status: 400 }
          );
        }

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

        // Convert value to appropriate type
        let processedValue: string | number | Date = value;
        
        if (masterType === 'endDate' || masterType === 'startDate' || masterType === 'terminationDeadline' || masterType === 'renewalDate') {
          processedValue = new Date(value);
        } else if (masterType === 'contractValue' || masterType === 'terminationPeriod') {
          processedValue = typeof value === 'number' ? value : parseFloat(value);
        }

        await setMasterVariable(id, masterType as MasterVariableType, processedValue, name);

        // Sync to contract model
        await syncMasterVariablesToContract(id);

        // Get updated master variables - ensure contractId is ObjectId
        const contractObjectId = new mongoose.Types.ObjectId(id);
        const masterVars = await getMasterVariables(id);
        
        // Find master variables - also include those with masterType even if isMaster is missing
        const masterVariables = await ContractVariable.find({
          contractId: contractObjectId,
          $or: [
            { isMaster: true },
            { masterType: { $exists: true, $ne: null } },
          ],
        }).lean();

        return NextResponse.json({
          success: true,
          masterVariables: masterVariables.map(v => ({
            _id: v._id.toString(),
            name: v.name,
            value: v.value,
            type: v.type,
            masterType: v.masterType,
            isMaster: v.isMaster !== undefined ? v.isMaster : true,
            metadata: v.metadata,
          })),
          computed: masterVars,
        });
      }
    } catch (error: any) {
      console.error('Error setting master variable:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to set master variable' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Remove master variable status from a variable
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const { searchParams } = new URL(req.url);
      const variableId = searchParams.get('variableId');
      const masterType = searchParams.get('masterType');

      if (!variableId && !masterType) {
        return NextResponse.json(
          { error: 'variableId or masterType is required' },
          { status: 400 }
        );
      }

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

      const query: any = {
        contractId: id,
        isMaster: true,
      };

      if (variableId) {
        query._id = variableId;
      } else if (masterType) {
        query.masterType = masterType;
      }

      const result = await ContractVariable.updateMany(query, {
        $set: {
          isMaster: false,
          masterType: undefined,
        },
      });

      return NextResponse.json({
        success: true,
        modified: result.modifiedCount,
      });
    } catch (error: any) {
      console.error('Error removing master variable:', error);
      return NextResponse.json(
        { error: 'Failed to remove master variable' },
        { status: 500 }
      );
    }
  })(req);
}


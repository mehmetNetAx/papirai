import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import Approval from '@/lib/db/models/Approval';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import Company from '@/lib/db/models/Company';
import mongoose from 'mongoose';
import { buildReportFilters } from '@/lib/utils/report-filters';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metricType = searchParams.get('type');
    const userId = user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Build filters based on user context
    const { companyFilter, workspaceFilter } = await buildReportFilters(user);

    let result: any = {};

    switch (metricType) {
      case 'totalValue': {
        // First, get contracts with value from Contract model
        const contractsWithValue = await Contract.find({
          ...companyFilter,
          ...workspaceFilter,
          isActive: true,
          value: { $exists: true, $ne: null },
        })
          .select('_id title value currency status')
          .sort({ value: -1 })
          .lean();
        
        // Also get contractValue and currency from master variables
        const contractIdsForValue = contractsWithValue.map((c: any) => new mongoose.Types.ObjectId(c._id));
        const masterVariables = await ContractVariable.find({
          contractId: { $in: contractIdsForValue },
          isMaster: true,
          masterType: { $in: ['contractValue', 'currency'] },
        }).lean();
        
        // Create maps for contractValue and currency by contractId
        const contractValueMap = new Map<string, number>();
        const currencyMap = new Map<string, string>();
        
        masterVariables.forEach((v: any) => {
          const contractIdStr = v.contractId.toString();
          if (v.masterType === 'contractValue') {
            const val = typeof v.value === 'number' ? v.value : parseFloat(v.value as string) || 0;
            contractValueMap.set(contractIdStr, val);
          } else if (v.masterType === 'currency') {
            currencyMap.set(contractIdStr, (v.value as string) || 'TRY');
          }
        });
        
        // Merge contract data with master variables (master variables take precedence)
        const mergedContracts = contractsWithValue.map((c: any) => {
          const contractIdStr = c._id.toString();
          const masterValue = contractValueMap.get(contractIdStr);
          const masterCurrency = currencyMap.get(contractIdStr);
          
          return {
            _id: contractIdStr,
            title: c.title,
            value: masterValue !== undefined ? masterValue : c.value,
            currency: masterCurrency || c.currency || 'TRY',
            status: c.status,
          };
        });
        
        result = {
          contracts: mergedContracts,
        };
        break;
      }

      case 'totalContracts': {
        const allContracts = await Contract.find({
          ...companyFilter,
          ...workspaceFilter,
          isActive: true,
        })
          .select('_id title value currency status')
          .sort({ updatedAt: -1 })
          .lean();
        
        result = {
          contracts: allContracts.map((c: any) => ({
            _id: c._id.toString(),
            title: c.title,
            value: c.value || null,
            currency: c.currency || 'TRY',
            status: c.status,
          })),
        };
        break;
      }

      case 'activeContracts': {
        const activeContracts = await Contract.find({
          ...companyFilter,
          ...workspaceFilter,
          isActive: true,
          status: 'executed',
        })
          .select('_id title value currency status')
          .sort({ updatedAt: -1 })
          .lean();
        
        result = {
          contracts: activeContracts.map((c: any) => ({
            _id: c._id.toString(),
            title: c.title,
            value: c.value || null,
            currency: c.currency || 'TRY',
            status: c.status,
          })),
        };
        break;
      }

      case 'expiringSoon': {
        const expiringContracts = await Contract.find({
          ...companyFilter,
          ...workspaceFilter,
          isActive: true,
          endDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
          .select('_id title value currency status endDate')
          .sort({ endDate: 1 })
          .lean();
        
        result = {
          contracts: expiringContracts.map((c: any) => ({
            _id: c._id.toString(),
            title: c.title,
            value: c.value || null,
            currency: c.currency || 'TRY',
            status: c.status,
            endDate: c.endDate,
          })),
        };
        break;
      }

      case 'totalVariables': {
        const contractIdsForVariables = await Contract.find({ ...companyFilter, ...workspaceFilter, isActive: true }).distinct('_id');
        
        if (contractIdsForVariables.length === 0) {
          result = { variables: [] };
        } else {
          const variables = await ContractVariable.find({
            contractId: { $in: contractIdsForVariables },
          })
            .populate('contractId', 'title')
            .select('_id name contractId')
            .lean();
          
          result = {
            variables: variables.map((v: any) => ({
              _id: v._id.toString(),
              name: v.name,
              contractId: {
                _id: v.contractId._id.toString(),
                title: v.contractId.title,
              },
            })),
          };
        }
        break;
      }

      case 'complianceTracked': {
        const contractIdsForCompliance = await Contract.find({ ...companyFilter, ...workspaceFilter, isActive: true }).distinct('_id');
        
        if (contractIdsForCompliance.length === 0) {
          result = { variables: [] };
        } else {
          const trackedVariables = await ContractVariable.find({
            contractId: { $in: contractIdsForCompliance },
            isComplianceTracked: true,
          })
            .populate('contractId', 'title')
            .select('_id name contractId')
            .lean();
          
          result = {
            variables: trackedVariables.map((v: any) => ({
              _id: v._id.toString(),
              name: v.name,
              contractId: {
                _id: v.contractId._id.toString(),
                title: v.contractId.title,
              },
            })),
          };
        }
        break;
      }

      case 'pendingApprovals': {
        const pendingApprovals = await Approval.find({
          approverId: userObjectId,
          status: 'pending',
        })
          .populate('contractId', 'title')
          .select('_id contractId status')
          .sort({ createdAt: -1 })
          .lean();
        
        result = {
          approvals: pendingApprovals.map((a: any) => ({
            _id: a._id.toString(),
            contractId: {
              _id: a.contractId._id.toString(),
              title: a.contractId.title,
            },
            status: a.status,
          })),
        };
        break;
      }

      case 'complianceAlerts': {
        const contractIdsForAlerts = await Contract.find({ ...companyFilter, ...workspaceFilter, isActive: true }).distinct('_id');
        
        if (contractIdsForAlerts.length === 0) {
          result = { complianceChecks: [] };
        } else {
          const alerts = await ComplianceCheck.find({
            contractId: { $in: contractIdsForAlerts },
            status: { $in: ['non_compliant', 'warning'] },
            alertLevel: { $in: ['high', 'critical'] },
          })
            .populate('contractId', 'title')
            .select('_id contractId status alertLevel')
            .sort({ checkedAt: -1 })
            .lean();
          
          result = {
            complianceChecks: alerts.map((c: any) => ({
              _id: c._id.toString(),
              contractId: {
                _id: c.contractId._id.toString(),
                title: c.contractId.title,
              },
              status: c.status,
              alertLevel: c.alertLevel,
            })),
          };
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid metric type' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching metric details:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}


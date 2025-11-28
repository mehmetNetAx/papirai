import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import mongoose from 'mongoose';
import { ContractStatus } from '@/lib/utils/contract-status';
import { buildReportFilters } from '@/lib/utils/report-filters';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build filters based on user context
    const { companyFilter, workspaceFilter } = await buildReportFilters(user);

    // Get all archived contracts (isActive = false)
    const archivedContracts = await Contract.find({
      ...companyFilter,
      ...workspaceFilter,
      isActive: false,
    })
      .select('_id title status updatedAt endDate currency value counterparty')
      .sort({ updatedAt: -1 })
      .lean();

    // Get master variables for contractValue, currency, endDate
    const contractIds = archivedContracts.map((c: any) => c._id);
    const masterVariables = await ContractVariable.find({
      contractId: { $in: contractIds },
      $or: [
        { isMaster: true },
        { masterType: { $exists: true, $ne: null } },
        { masterType: 'contractValue' },
        { masterType: 'currency' },
        { masterType: 'endDate' },
      ],
    }).lean();

    // Group master variables by contract
    const variablesByContract: Record<string, {
      contractValue?: number;
      currency?: string;
      endDate?: Date;
    }> = {};

    for (const variable of masterVariables) {
      const contractId = (variable.contractId as any).toString();
      if (!variablesByContract[contractId]) {
        variablesByContract[contractId] = {};
      }
      if (variable.masterType === 'contractValue') {
        variablesByContract[contractId].contractValue =
          typeof variable.value === 'number' ? variable.value : parseFloat(variable.value as string) || 0;
      } else if (variable.masterType === 'currency') {
        variablesByContract[contractId].currency = variable.value as string;
      } else if (variable.masterType === 'endDate') {
        const dateValue = variable.value;
        if (dateValue) {
          const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
          if (!isNaN(date.getTime())) {
            variablesByContract[contractId].endDate = date;
          }
        }
      }
    }

    // Count by status
    const byStatus: Record<ContractStatus, number> = {
      draft: 0,
      in_review: 0,
      pending_approval: 0,
      approved: 0,
      pending_signature: 0,
      executed: 0,
      expired: 0,
      terminated: 0,
    };

    // Calculate financial summary
    let totalValue = 0;
    let contractsWithValue = 0;
    const archiveDates: Date[] = [];

    const contractsList = archivedContracts.map((contract: any) => {
      const contractId = contract._id.toString();
      const masterVars = variablesByContract[contractId] || {};

      const contractValue =
        masterVars.contractValue !== undefined
          ? masterVars.contractValue
          : (contract.value as number) || 0;
      const currency = masterVars.currency || (contract.currency as string) || 'USD';
      const endDate = masterVars.endDate || (contract.endDate ? new Date(contract.endDate) : undefined);

      if (contractValue > 0) {
        totalValue += contractValue;
        contractsWithValue++;
      }

      // Count by status
      const status = contract.status as ContractStatus;
      if (status in byStatus) {
        byStatus[status]++;
      }

      // Track archive dates (using updatedAt as proxy for archive date)
      if (contract.updatedAt) {
        archiveDates.push(new Date(contract.updatedAt));
      }

      return {
        _id: contractId,
        title: contract.title,
        status: contract.status,
        archivedAt: contract.updatedAt || contract.createdAt,
        contractValue: contractValue > 0 ? contractValue : undefined,
        currency: contractValue > 0 ? currency : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        counterparty: contract.counterparty,
      };
    });

    const averageValue = contractsWithValue > 0 ? totalValue / contractsWithValue : 0;

    // Group by year
    const byYearMap: Record<number, number> = {};
    for (const contract of contractsList) {
      const year = new Date(contract.archivedAt).getFullYear();
      byYearMap[year] = (byYearMap[year] || 0) + 1;
    }

    const byYear = Object.entries(byYearMap)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year);

    const oldestArchive = archiveDates.length > 0
      ? new Date(Math.min(...archiveDates.map(d => d.getTime()))).toISOString()
      : null;
    const newestArchive = archiveDates.length > 0
      ? new Date(Math.max(...archiveDates.map(d => d.getTime()))).toISOString()
      : null;

    return NextResponse.json({
      summary: {
        totalArchived: archivedContracts.length,
        byStatus,
        totalValue,
        averageValue,
        oldestArchive,
        newestArchive,
      },
      contracts: contractsList,
      byStatus,
      byYear,
    });
  } catch (error: any) {
    console.error('Error generating archived report:', error);
    return NextResponse.json(
      { error: 'Failed to generate archived report', details: error.message },
      { status: 500 }
    );
  }
}


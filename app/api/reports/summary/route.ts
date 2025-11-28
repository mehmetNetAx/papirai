import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import mongoose from 'mongoose';
import { ContractStatus } from '@/lib/utils/contract-status';
import { checkDateStatus } from '@/lib/utils/date-status';
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

    // Get all contracts
    const contracts = await Contract.find({
      ...companyFilter,
      ...workspaceFilter,
    })
      .select('_id title status isActive endDate currency value updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    const activeContracts = contracts.filter((c: any) => c.isActive !== false);
    const archivedContracts = contracts.filter((c: any) => c.isActive === false);

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

    for (const contract of activeContracts) {
      const status = contract.status as ContractStatus;
      if (status in byStatus) {
        byStatus[status]++;
      }
    }

    // Get master variables for endDate, contractValue, currency
    const contractIds = contracts.map((c: any) => c._id);
    const masterVariables = await ContractVariable.find({
      contractId: { $in: contractIds },
      $or: [
        { isMaster: true },
        { masterType: { $exists: true, $ne: null } },
        { masterType: 'endDate' },
        { masterType: 'contractValue' },
        { masterType: 'currency' },
      ],
    }).lean();

    // Group master variables by contract
    const variablesByContract: Record<string, {
      endDate?: Date;
      contractValue?: number;
      currency?: string;
    }> = {};

    for (const variable of masterVariables) {
      const contractId = (variable.contractId as any).toString();
      if (!variablesByContract[contractId]) {
        variablesByContract[contractId] = {};
      }
      if (variable.masterType === 'endDate') {
        const dateValue = variable.value;
        if (dateValue) {
          const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
          if (!isNaN(date.getTime())) {
            variablesByContract[contractId].endDate = date;
          }
        }
      } else if (variable.masterType === 'contractValue') {
        variablesByContract[contractId].contractValue =
          typeof variable.value === 'number' ? variable.value : parseFloat(variable.value as string) || 0;
      } else if (variable.masterType === 'currency') {
        variablesByContract[contractId].currency = variable.value as string;
      }
    }

    // Count by date status
    const byDateStatus = {
      passed: 0,
      critical: 0,
      warning: 0,
      normal: 0,
      noDate: 0,
    };

    for (const contract of activeContracts) {
      const contractId = contract._id.toString();
      const masterVars = variablesByContract[contractId] || {};
      const endDate = masterVars.endDate || (contract.endDate ? new Date(contract.endDate) : null);

      if (!endDate || isNaN(endDate.getTime())) {
        byDateStatus.noDate++;
        continue;
      }

      const dateStatus = checkDateStatus(endDate, 'Bitiş Tarihi', 30, 7);
      if (dateStatus) {
        byDateStatus[dateStatus.status]++;
      } else {
        byDateStatus.noDate++;
      }
    }

    // Financial summary
    const currencyTotals: Record<string, { total: number; count: number }> = {};
    let totalValue = 0;
    let contractsWithValue = 0;

    for (const contract of activeContracts) {
      const contractId = contract._id.toString();
      const masterVars = variablesByContract[contractId] || {};

      const contractValue =
        masterVars.contractValue !== undefined
          ? masterVars.contractValue
          : (contract.value as number) || 0;
      const currency = masterVars.currency || (contract.currency as string) || 'USD';

      if (contractValue > 0) {
        if (!currencyTotals[currency]) {
          currencyTotals[currency] = { total: 0, count: 0 };
        }
        currencyTotals[currency].total += contractValue;
        currencyTotals[currency].count += 1;
        totalValue += contractValue;
        contractsWithValue++;
      }
    }

    const totalByCurrency = Object.entries(currencyTotals).map(([currency, data]) => ({
      currency,
      total: data.total,
      count: data.count,
    }));

    const averageValue = contractsWithValue > 0 ? totalValue / contractsWithValue : 0;

    // Compliance summary
    const complianceChecks = await ComplianceCheck.find({
      contractId: { $in: contractIds },
    }).lean();

    const trackedVariables = await ContractVariable.find({
      contractId: { $in: contractIds },
      isComplianceTracked: true,
    }).countDocuments();

    const compliance = {
      totalChecks: complianceChecks.length,
      compliant: complianceChecks.filter((c: any) => c.status === 'compliant').length,
      nonCompliant: complianceChecks.filter((c: any) => c.status === 'non_compliant').length,
      warning: complianceChecks.filter((c: any) => c.status === 'warning').length,
      pending: complianceChecks.filter((c: any) => c.status === 'pending').length,
      trackedVariables,
    };

    // Top contracts by value
    const contractsWithFinancial = activeContracts
      .map((contract: any) => {
        const contractId = contract._id.toString();
        const masterVars = variablesByContract[contractId] || {};
        const contractValue =
          masterVars.contractValue !== undefined
            ? masterVars.contractValue
            : (contract.value as number) || 0;
        const currency = masterVars.currency || (contract.currency as string) || 'USD';

        return {
          _id: contractId,
          title: contract.title,
          contractValue,
          currency,
        };
      })
      .filter((c) => c.contractValue > 0)
      .sort((a, b) => b.contractValue - a.contractValue)
      .slice(0, 5);

    // Recent activity (last 10 updated contracts)
    const recentActivity = activeContracts.slice(0, 10).map((contract: any) => ({
      _id: contract._id.toString(),
      title: contract.title,
      status: contract.status,
      updatedAt: contract.updatedAt,
    }));

    return NextResponse.json({
      overview: {
        totalContracts: contracts.length,
        activeContracts: activeContracts.length,
        archivedContracts: archivedContracts.length,
        totalValue,
        currencies: Object.keys(currencyTotals),
      },
      byStatus,
      byDateStatus,
      financial: {
        totalByCurrency,
        averageValue,
      },
      compliance,
      recentActivity,
      topContracts: contractsWithFinancial,
    });
  } catch (error: any) {
    console.error('Error generating summary report:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary report', details: error.message },
      { status: 500 }
    );
  }
}


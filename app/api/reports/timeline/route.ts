import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import mongoose from 'mongoose';
import { checkDateStatus, DateStatus } from '@/lib/utils/date-status';
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

    // Get all active contracts
    const contracts = await Contract.find({
      ...companyFilter,
      ...workspaceFilter,
      isActive: true,
    })
      .select('_id title status counterparty endDate')
      .lean();

    // Get master variables for endDate
    const contractIds = contracts.map((c: any) => c._id);
    const endDateVariables = await ContractVariable.find({
      contractId: { $in: contractIds },
      $or: [
        { isMaster: true },
        { masterType: { $exists: true, $ne: null } },
      ],
      masterType: 'endDate',
    }).lean();

    // Group endDate variables by contract
    const endDatesByContract: Record<string, Date> = {};
    for (const variable of endDateVariables) {
      const contractId = (variable.contractId as any).toString();
      const dateValue = variable.value;
      if (dateValue) {
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (!isNaN(date.getTime())) {
          endDatesByContract[contractId] = date;
        }
      }
    }

    // Categorize contracts by date status
    const categorized: Record<DateStatus | 'noDate', any[]> = {
      passed: [],
      critical: [],
      warning: [],
      normal: [],
      noDate: [],
    };

    for (const contract of contracts) {
      const contractId = contract._id.toString();
      
      // Prefer master variable, fallback to contract field
      const endDate = endDatesByContract[contractId] || (contract.endDate ? new Date(contract.endDate) : null);

      if (!endDate || isNaN(endDate.getTime())) {
        categorized.noDate.push({
          _id: contractId,
          title: contract.title,
          status: contract.status,
          counterparty: contract.counterparty,
        });
        continue;
      }

      const dateStatus = checkDateStatus(endDate, 'Bitiş Tarihi', 30, 7);
      if (!dateStatus) {
        categorized.noDate.push({
          _id: contractId,
          title: contract.title,
          status: contract.status,
          counterparty: contract.counterparty,
        });
        continue;
      }

      const contractData = {
        _id: contractId,
        title: contract.title,
        endDate: endDate.toISOString(),
        daysRemaining: dateStatus.daysRemaining,
        status: contract.status,
        counterparty: contract.counterparty,
      };

      categorized[dateStatus.status].push(contractData);
    }

    return NextResponse.json({
      passed: categorized.passed,
      critical: categorized.critical,
      warning: categorized.warning,
      normal: categorized.normal,
      noDate: categorized.noDate,
      summary: {
        total: contracts.length,
        passed: categorized.passed.length,
        critical: categorized.critical.length,
        warning: categorized.warning.length,
        normal: categorized.normal.length,
        noDate: categorized.noDate.length,
      },
    });
  } catch (error: any) {
    console.error('Error generating timeline report:', error);
    return NextResponse.json(
      { error: 'Failed to generate timeline report', details: error.message },
      { status: 500 }
    );
  }
}


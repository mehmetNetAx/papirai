import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import mongoose from 'mongoose';
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
    const allContracts = await Contract.find({
      ...companyFilter,
      ...workspaceFilter,
    }).lean();
    const totalContracts = allContracts.length;

    // Count active and archived
    const activeContracts = allContracts.filter((c: any) => c.isActive !== false).length;
    const archived = allContracts.filter((c: any) => c.isActive === false).length;

    // Get active contracts for deadline check
    const activeContractIds = allContracts
      .filter((c: any) => c.isActive !== false)
      .map((c: any) => c._id);

    // Get master variables for endDate
    const endDateVariables = await ContractVariable.find({
      contractId: { $in: activeContractIds },
      $or: [
        { isMaster: true },
        { masterType: { $exists: true, $ne: null } },
      ],
      masterType: 'endDate',
    }).lean();

    // Count upcoming deadlines (critical + warning)
    let upcomingDeadlines = 0;
    for (const variable of endDateVariables) {
      const dateValue = variable.value;
      if (dateValue) {
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const dateStatus = checkDateStatus(date, 'Bitiş Tarihi', 30, 7);
          if (dateStatus && (dateStatus.status === 'critical' || dateStatus.status === 'warning')) {
            upcomingDeadlines++;
          }
        }
      }
    }

    return NextResponse.json({
      totalContracts,
      activeContracts,
      upcomingDeadlines,
      archived,
    });
  } catch (error: any) {
    console.error('Error generating quick stats:', error);
    return NextResponse.json(
      { error: 'Failed to generate quick stats', details: error.message },
      { status: 500 }
    );
  }
}


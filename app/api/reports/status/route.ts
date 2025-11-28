import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
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

    // Get all contracts grouped by status
    const contracts = await Contract.find({
      ...companyFilter,
      ...workspaceFilter,
      isActive: true,
    })
      .select('_id title status createdAt updatedAt')
      .lean();

    const allStatuses: ContractStatus[] = [
      'draft',
      'in_review',
      'pending_approval',
      'approved',
      'pending_signature',
      'executed',
      'expired',
      'terminated',
    ];

    const reports: Record<ContractStatus, any> = {} as any;

    for (const status of allStatuses) {
      const statusContracts = contracts.filter((c: any) => c.status === status);
      reports[status] = {
        status,
        count: statusContracts.length,
        contracts: statusContracts.map((c: any) => ({
          _id: c._id.toString(),
          title: c.title,
          status: c.status,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      };
    }

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error('Error generating status report:', error);
    return NextResponse.json(
      { error: 'Failed to generate status report', details: error.message },
      { status: 500 }
    );
  }
}


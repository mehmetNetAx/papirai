import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { getContractMasterVariableStatuses, getContractsByMasterVariableStatus, MasterVariableStatus } from '@/lib/services/master-variables';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const companyId = session.user.companyId;
    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    // Get all contracts
    const contracts = await Contract.find({
      companyId: companyObjectId,
      isActive: true,
      status: { $in: ['executed', 'approved'] },
    }).lean();

    const reports = {
      passed: [] as any[],
      critical: [] as any[],
      warning: [] as any[],
      normal: [] as any[],
      summary: {
        total: 0,
        passed: 0,
        critical: 0,
        warning: 0,
        normal: 0,
      },
    };

    for (const contract of contracts) {
      try {
        const statuses = await getContractMasterVariableStatuses(contract._id.toString());
        
        // Only include contracts that have at least one master variable with a date
        if (!statuses.endDate && !statuses.terminationDeadline && !statuses.renewalDate) {
          // Skip contracts without any date-based master variables
          continue;
        }
        
        // Debug logging
        if (statuses.endDate || statuses.terminationDeadline || statuses.renewalDate) {
          console.log(`Contract ${contract.title}:`, {
            endDate: statuses.endDate,
            terminationDeadline: statuses.terminationDeadline,
            renewalDate: statuses.renewalDate,
            overallStatus: statuses.overallStatus,
          });
        }
        
        const contractReport = {
          _id: contract._id.toString(),
          title: contract.title,
          status: contract.status,
          statuses,
          endDate: statuses.endDate,
          terminationDeadline: statuses.terminationDeadline,
          renewalDate: statuses.renewalDate,
          overallStatus: statuses.overallStatus,
        };

        reports[statuses.overallStatus].push(contractReport);
        reports.summary[statuses.overallStatus]++;
        reports.summary.total++;
      } catch (error: any) {
        console.error(`Error processing contract ${contract._id}:`, error);
        // Continue with next contract
      }
    }
    
    console.log('Reports summary:', reports.summary);

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error('Error generating master variable reports:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate reports' },
      { status: 500 }
    );
  }
}


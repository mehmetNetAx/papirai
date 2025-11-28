import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import { getContractMasterVariableStatuses, getContractsByMasterVariableStatus, MasterVariableStatus } from '@/lib/services/master-variables';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const contractId = searchParams.get('contractId');
    const status = searchParams.get('status') as MasterVariableStatus | null;
    const companyId = session.user.companyId;

    if (contractId) {
      // Get status for a specific contract
      const statuses = await getContractMasterVariableStatuses(contractId);
      return NextResponse.json(statuses);
    }

    if (status) {
      // Get contracts by status
      const contracts = await getContractsByMasterVariableStatus(status, companyId);
      return NextResponse.json({ contracts, count: contracts.length });
    }

    return NextResponse.json({ error: 'contractId or status parameter required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error getting master variable status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get master variable status' },
      { status: 500 }
    );
  }
}


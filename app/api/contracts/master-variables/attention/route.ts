import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { requireAuth } from '@/lib/auth/middleware';
import { getContractsNeedingAttention } from '@/lib/services/master-variables';

// GET - Get contracts that need attention based on master variables
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const companyId = searchParams.get('companyId') || user.companyId?.toString();

      const contracts = await getContractsNeedingAttention(companyId || undefined);

      return NextResponse.json({
        contracts,
        count: contracts.length,
      });
    } catch (error: any) {
      console.error('Error fetching contracts needing attention:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contracts needing attention' },
        { status: 500 }
      );
    }
  })(req);
}


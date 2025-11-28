import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { requireAuth } from '@/lib/auth/middleware';
import { checkContractDeadlines } from '@/lib/services/master-variables';

// POST - Manually trigger deadline check (usually called by cron job)
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      // Check if user has admin permissions (you may want to add this check)
      // For now, allow any authenticated user to trigger this
      
      await checkContractDeadlines();

      return NextResponse.json({
        success: true,
        message: 'Deadline check completed',
      });
    } catch (error: any) {
      console.error('Error checking deadlines:', error);
      return NextResponse.json(
        { error: 'Failed to check deadlines' },
        { status: 500 }
      );
    }
  })(req);
}


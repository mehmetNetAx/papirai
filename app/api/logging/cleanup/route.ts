import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import { cleanupOldLogs } from '@/lib/services/user-logging';

// POST - Run cleanup job manually
export async function POST(req: NextRequest) {
  return requireRole(['system_admin'])(async (req: NextRequest, user) => {
    try {
      await connectDB();
      
      const result = await cleanupOldLogs();
      
      return NextResponse.json({
        message: 'Cleanup completed',
        ...result,
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error running cleanup:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to run cleanup' },
        { status: 500 }
      );
    }
  })(req);
}



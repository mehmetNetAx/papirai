import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import { getUserLoggingStats } from '@/lib/services/user-logging';

// GET - Get user logging statistics
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { userId } = await params;
      await connectDB();
      
      // Only system admin or the user themselves can view stats
      if (user.role !== 'system_admin' && user.id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      const stats = await getUserLoggingStats(userId);
      
      return NextResponse.json(stats, { status: 200 });
    } catch (error: any) {
      console.error('Error getting user logging stats:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get user logging stats' },
        { status: 500 }
      );
    }
  })(req);
}



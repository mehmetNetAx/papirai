import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import { runDocumentValidityCheck } from '@/lib/jobs/document-validity';

// POST - Manually trigger document validity check (admin only)
export async function POST(req: NextRequest) {
  return requireRole(['system_admin', 'group_admin'])(async (req: NextRequest, user) => {
    try {
      await connectDB();

      await runDocumentValidityCheck();

      return NextResponse.json({
        success: true,
        message: 'Document validity check completed',
      });
    } catch (error: any) {
      console.error('Error checking document validity:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to check document validity' },
        { status: 500 }
      );
    }
  })(req);
}


import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { requireAuth } from '@/lib/auth/middleware';
import { restoreVersion } from '@/lib/services/version';
import { canEditContract } from '@/lib/utils/permissions';

// POST - Restore a version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id, versionId } = await params;
      await connectDB();

      const contract = await Contract.findById(id);
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      await restoreVersion(id, versionId, user.id);
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error restoring version:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to restore version' },
        { status: 500 }
      );
    }
  })(req);
}


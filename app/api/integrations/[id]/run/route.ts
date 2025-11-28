import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Integration from '@/lib/db/models/Integration';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import { canAccessCompany } from '@/lib/utils/permissions';
import { runIntegrationCheck } from '@/lib/services/integration/runner';

// POST - Manually trigger integration compliance check
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireRole(['system_admin', 'group_admin', 'company_admin'])(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const integration = await Integration.findById(id);
      if (!integration) {
        return NextResponse.json(
          { error: 'Integration not found' },
          { status: 404 }
        );
      }

      // Check access
      const companyId = integration.companyId?.toString();
      if (user.role !== 'system_admin' && !canAccessCompany(user, companyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      if (!integration.isActive) {
        return NextResponse.json(
          { error: 'Integration is not active' },
          { status: 400 }
        );
      }

      // Run compliance check
      await runIntegrationCheck(id);

      return NextResponse.json({ message: 'Compliance check completed successfully' });
    } catch (error: any) {
      console.error('Error running integration check:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to run compliance check' },
        { status: 500 }
      );
    }
  })(req);
}


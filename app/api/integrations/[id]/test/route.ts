import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Integration from '@/lib/db/models/Integration';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import { canAccessCompany } from '@/lib/utils/permissions';
import { createIntegrationAdapter } from '@/lib/services/integration/factory';

// POST - Test integration connection
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

      // Create adapter and test connection
      const adapter = createIntegrationAdapter(
        integration.type,
        integration.config,
        integration.mapping?.variableMappings || {},
        integration.mapping?.fieldMappings || {}
      );

      const testResult = await adapter.testConnection();

      return NextResponse.json(testResult);
    } catch (error: any) {
      console.error('Error testing integration:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Connection test failed' },
        { status: 500 }
      );
    }
  })(req);
}


import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Integration from '@/lib/db/models/Integration';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import { canAccessCompany } from '@/lib/utils/permissions';
import { z } from 'zod';
import AuditLog from '@/lib/db/models/AuditLog';
import { createIntegrationAdapter } from '@/lib/services/integration/factory';
import { runIntegrationCheck } from '@/lib/services/integration/runner';
import mongoose from 'mongoose';

// GET - Get integration details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const integration = await Integration.findById(id)
        .populate('companyId', 'name')
        .populate('createdBy', 'name')
        .lean();

      if (!integration) {
        return NextResponse.json(
          { error: 'Integration not found' },
          { status: 404 }
        );
      }

      // Check access
      const companyId = (integration as any).companyId?._id?.toString() || (integration as any).companyId?.toString();
      if (user.role !== 'system_admin' && !canAccessCompany(user, companyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      return NextResponse.json({ integration });
    } catch (error) {
      console.error('Error fetching integration:', error);
      return NextResponse.json(
        { error: 'Failed to fetch integration' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Update integration
export async function PATCH(
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

      const body = await req.json();

      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
        config: z.object({
          apiEndpoint: z.string().optional(),
          apiKey: z.string().optional(),
          username: z.string().optional(),
          password: z.string().optional(),
          database: z.string().optional(),
          port: z.number().optional(),
          customFields: z.record(z.any()).optional(),
        }).optional(),
        mapping: z.object({
          variableMappings: z.record(z.string()).optional(),
          fieldMappings: z.record(z.string()).optional(),
        }).optional(),
        schedule: z.object({
          enabled: z.boolean().optional(),
          frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
          time: z.string().optional(),
          dayOfWeek: z.number().optional(),
          dayOfMonth: z.number().optional(),
        }).optional(),
      });

      const validatedData = updateSchema.parse(body);

      // Update fields
      if (validatedData.name) integration.name = validatedData.name;
      if (validatedData.isActive !== undefined) integration.isActive = validatedData.isActive;
      if (validatedData.config) {
        integration.config = {
          ...integration.config,
          ...validatedData.config,
        };
      }
      if (validatedData.mapping) {
        integration.mapping = {
          ...integration.mapping,
          ...validatedData.mapping,
        };
      }
      if (validatedData.schedule) {
        integration.schedule = {
          ...integration.schedule,
          ...validatedData.schedule,
        };
      }

      // Test connection if config changed
      if (validatedData.config) {
        const adapter = createIntegrationAdapter(
          integration.type,
          integration.config,
          integration.mapping?.variableMappings || {},
          integration.mapping?.fieldMappings || {}
        );

        const testResult = await adapter.testConnection();
        if (!testResult.success) {
          return NextResponse.json(
            { error: `Connection test failed: ${testResult.message}` },
            { status: 400 }
          );
        }
      }

      await integration.save();

      // Log audit
      try {
        await AuditLog.create({
          userId: new mongoose.Types.ObjectId(user.id),
          action: 'update_integration',
          resourceType: 'integration',
          resourceId: integration._id,
          details: { updatedFields: Object.keys(validatedData) },
        });
      } catch (auditError: any) {
        // Don't fail if audit log fails
        console.warn('Failed to create audit log:', auditError.message);
      }

      const updatedIntegration = await Integration.findById(id)
        .populate('companyId', 'name')
        .populate('createdBy', 'name')
        .lean();

      return NextResponse.json({ integration: updatedIntegration });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error updating integration:', error);
      return NextResponse.json(
        { error: 'Failed to update integration' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete integration
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireRole(['system_admin', 'group_admin', 'company_admin'])(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      console.log('Deleting integration:', id);

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

      console.log('Deleting integration:', integration.name);

      await Integration.findByIdAndDelete(id);
      console.log('Integration deleted successfully');

      // Log audit
      try {
        await AuditLog.create({
          userId: new mongoose.Types.ObjectId(user.id),
          action: 'delete_integration',
          resourceType: 'integration',
          resourceId: new mongoose.Types.ObjectId(id),
          details: { name: integration.name, type: integration.type },
        });
        console.log('Audit log created');
      } catch (auditError: any) {
        // Don't fail if audit log fails
        console.warn('Failed to create audit log:', auditError.message);
      }

      return NextResponse.json({ message: 'Integration deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting integration:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      return NextResponse.json(
        { 
          error: error.message || 'Failed to delete integration',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  })(req);
}


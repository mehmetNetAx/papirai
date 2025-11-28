import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Integration from '@/lib/db/models/Integration';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import { canAccessCompany } from '@/lib/utils/permissions';
import { z } from 'zod';
import AuditLog from '@/lib/db/models/AuditLog';
import { createIntegrationAdapter } from '@/lib/services/integration/factory';
import mongoose from 'mongoose';

// GET - List integrations
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const companyId = searchParams.get('companyId');

      let query: any = {};

      // Filter by company
      if (companyId) {
        if (!canAccessCompany(user, companyId)) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          );
        }
        query.companyId = companyId;
      } else if (user.role !== 'system_admin') {
        // Non-system admins can only see their company's integrations
        query.companyId = user.companyId;
      }

      const integrations = await Integration.find(query)
        .populate('companyId', 'name')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({ integrations });
    } catch (error) {
      console.error('Error fetching integrations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Create integration
export async function POST(req: NextRequest) {
  return requireRole(['system_admin', 'group_admin', 'company_admin'])(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      console.log('Received integration data:', JSON.stringify(body, null, 2));

      const integrationSchema = z.object({
        name: z.string().min(1),
        type: z.enum(['sap', 'nebim', 'logo', 'netsis', 'custom']),
        companyId: z.string(),
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

      let validatedData;
      try {
        validatedData = integrationSchema.parse(body);
        console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      } catch (validationError: any) {
        console.error('Validation error:', validationError);
        return NextResponse.json(
          { error: 'Validation error', details: validationError.errors },
          { status: 400 }
        );
      }

      // Check if user can access this company
      if (!canAccessCompany(user, validatedData.companyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Test connection before creating (optional - can be skipped if config is incomplete)
      try {
        const adapter = createIntegrationAdapter(
          validatedData.type,
          validatedData.config || {},
          validatedData.mapping?.variableMappings || {},
          validatedData.mapping?.fieldMappings || {}
        );

        const testResult = await adapter.testConnection();
        if (!testResult.success) {
          // Don't block creation if connection test fails - just warn
          console.warn(`Connection test failed for ${validatedData.name}: ${testResult.message}`);
        }
      } catch (testError: any) {
        // Don't block creation if connection test throws an error
        console.warn(`Connection test error for ${validatedData.name}:`, testError.message);
      }

      // Convert companyId and createdBy to ObjectId
      console.log('Creating integration with data:', {
        name: validatedData.name,
        type: validatedData.type,
        companyId: validatedData.companyId,
        userId: user.id,
      });

      let integration;
      try {
        integration = await Integration.create({
          name: validatedData.name,
          type: validatedData.type,
          companyId: new mongoose.Types.ObjectId(validatedData.companyId),
          isActive: validatedData.isActive ?? true,
          config: validatedData.config || {},
          mapping: validatedData.mapping || {},
          schedule: {
            enabled: validatedData.schedule?.enabled ?? false,
            frequency: validatedData.schedule?.frequency || 'daily',
            time: validatedData.schedule?.time,
            dayOfWeek: validatedData.schedule?.dayOfWeek,
            dayOfMonth: validatedData.schedule?.dayOfMonth,
          },
          createdBy: new mongoose.Types.ObjectId(user.id),
        });
        console.log('Integration created successfully:', integration._id);
      } catch (createError: any) {
        console.error('Error creating integration in database:', createError);
        console.error('Create error name:', createError.name);
        console.error('Create error message:', createError.message);
        console.error('Create error stack:', createError.stack);
        throw createError;
      }

      // Log audit
      try {
        await AuditLog.create({
          userId: new mongoose.Types.ObjectId(user.id),
          action: 'create_integration',
          resourceType: 'integration',
          resourceId: integration._id,
          details: { name: integration.name, type: integration.type },
        });
      } catch (auditError: any) {
        // Don't fail if audit log fails
        console.warn('Failed to create audit log:', auditError.message);
      }

      const populatedIntegration = await Integration.findById(integration._id)
        .populate('companyId', 'name')
        .populate('createdBy', 'name')
        .lean();

      return NextResponse.json({ integration: populatedIntegration }, { status: 201 });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error creating integration:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Return detailed error in development
      const errorResponse: any = {
        error: error.message || 'Failed to create integration',
      };
      
      if (process.env.NODE_ENV === 'development') {
        errorResponse.details = error.stack;
        errorResponse.errorName = error.name;
      }
      
      return NextResponse.json(errorResponse, { status: 500 });
    }
  })(req);
}


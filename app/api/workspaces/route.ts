import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Workspace from '@/lib/db/models/Workspace';
import { requireAuth } from '@/lib/auth/middleware';
import { workspaceSchema } from '@/lib/utils/validation';
import { canAccessCompany } from '@/lib/utils/permissions';
import AuditLog from '@/lib/db/models/AuditLog';

// GET - List workspaces
const handleGet = requireAuth(async (req: NextRequest, user) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    let query: any = { isActive: true };

    // System admin sees all workspaces
    if (user.role === 'system_admin') {
      // No company filter for system admin
      if (companyId) {
        query.companyId = companyId;
      }
    } else if (companyId) {
      // Verify user can access this company
      if (!canAccessCompany(user, companyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
      query.companyId = companyId;
    } else {
      // Filter by user's company
      query.companyId = user.companyId;
    }

    const workspaces = await Workspace.find(query)
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
});

// POST - Create workspace
const handlePost = requireAuth(async (req: NextRequest, user) => {
  try {
    await connectDB();

    const body = await req.json();
    const validatedData = workspaceSchema.parse(body);

    // Verify user can access the company
    if (!canAccessCompany(user, validatedData.companyId)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if workspace name already exists in this company
    const existing = await Workspace.findOne({
      name: validatedData.name,
      companyId: validatedData.companyId,
      isActive: true,
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Workspace with this name already exists in this company' },
        { status: 400 }
      );
    }

    const workspace = await Workspace.create({
      ...validatedData,
      createdBy: user.id,
    });

    // Log audit
    await AuditLog.create({
      userId: user.id,
      action: 'create_workspace',
      resourceType: 'workspace',
      resourceId: workspace._id,
      details: { name: workspace.name, companyId: workspace.companyId },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
});

export const GET = handleGet;
export const POST = handlePost;


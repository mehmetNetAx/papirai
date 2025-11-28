import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Company from '@/lib/db/models/Company';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import { companySchema } from '@/lib/utils/validation';
import AuditLog from '@/lib/db/models/AuditLog';

// GET - List companies (with access control)
const handleGet = requireAuth(async (req: NextRequest, user) => {
  try {
    await connectDB();

    let query: any = { isActive: true };

    // System admin can see all companies
    if (user.role !== 'system_admin') {
      // Group admin can see their group and subsidiaries
      if (user.role === 'group_admin' && user.groupId) {
        query.$or = [
          { _id: user.companyId },
          { _id: user.groupId },
          { parentCompanyId: user.groupId },
        ];
      } else {
        // Others can only see their own company
        query._id = user.companyId;
      }
    }

    const companies = await Company.find(query).sort({ name: 1 });

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
});

// POST - Create company (admin only)
const handlePost = requireRole(['system_admin', 'group_admin'])(async (req: NextRequest, user) => {
  try {
    await connectDB();

    const body = await req.json();
    const validatedData = companySchema.parse(body);

    // Check if company name already exists
    const existing = await Company.findOne({ name: validatedData.name, isActive: true });
    if (existing) {
      return NextResponse.json(
        { error: 'Company with this name already exists' },
        { status: 400 }
      );
    }

    // If creating subsidiary, verify parent exists
    if (validatedData.type === 'subsidiary' && validatedData.parentCompanyId) {
      const parent = await Company.findById(validatedData.parentCompanyId);
      if (!parent || !parent.isActive) {
        return NextResponse.json(
          { error: 'Parent company not found' },
          { status: 400 }
        );
      }
    }

    const company = await Company.create({
      ...validatedData,
      parentCompanyId: validatedData.parentCompanyId || undefined,
    });

    // Log audit
    await AuditLog.create({
      userId: user.id,
      action: 'create_company',
      resourceType: 'company',
      resourceId: company._id,
      details: { name: company.name, type: company.type },
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
});

export const GET = handleGet;
export const POST = handlePost;


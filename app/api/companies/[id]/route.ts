import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Company from '@/lib/db/models/Company';
import Workspace from '@/lib/db/models/Workspace';
import User from '@/lib/db/models/User';
import { requireAuth } from '@/lib/auth/middleware';
import { canAccessCompany } from '@/lib/utils/permissions';
import mongoose from 'mongoose';

// GET - Get company details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const company = await Company.findById(id)
        .populate('parentCompanyId', 'name')
        .lean();

      if (!company || !company.isActive) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }

      // Check access
      const companyId = (company as any)._id.toString();
      if (user.role !== 'system_admin' && !canAccessCompany(user, companyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      return NextResponse.json({ company });
    } catch (error) {
      console.error('Error fetching company:', error);
      return NextResponse.json(
        { error: 'Failed to fetch company' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Update company
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      // Only admins can update companies
      if (!['system_admin', 'group_admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const { id } = await params;
      await connectDB();

      const company = await Company.findById(id);

      if (!company || !company.isActive) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }

      // Check access
      const companyId = company._id.toString();
      if (user.role !== 'system_admin' && !canAccessCompany(user, companyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { name, settings } = body;

      // Update allowed fields
      if (name !== undefined) {
        company.name = name;
      }
      if (settings !== undefined) {
        company.settings = { ...company.settings, ...settings };
      }

      await company.save();

      return NextResponse.json({ company });
    } catch (error: any) {
      console.error('Error updating company:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update company' },
        { status: 500 }
      );
    }
  })(req);
}


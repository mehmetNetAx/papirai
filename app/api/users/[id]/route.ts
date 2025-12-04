import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { requireAuth } from '@/lib/auth/middleware';
import { canAccessCompany } from '@/lib/utils/permissions';
import AuditLog from '@/lib/db/models/AuditLog';
import mongoose from 'mongoose';
import { z } from 'zod';

// GET - Get user details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      // Only admins can view user details
      if (!['system_admin', 'group_admin', 'company_admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const targetUser = await User.findById(id)
        .select('-password')
        .populate('companyId', 'name')
        .populate('groupId', 'name')
        .lean();

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user can access this user's company
      const userCompanyId = (targetUser as any).companyId?._id?.toString() || (targetUser as any).companyId?.toString();
      if (user.role !== 'system_admin' && !canAccessCompany(user, userCompanyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      return NextResponse.json({ user: targetUser });
    } catch (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      // Only admins can update users
      if (!['system_admin', 'group_admin', 'company_admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const targetUser = await User.findById(id);
      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user can access this user's company
      const userCompanyId = targetUser.companyId?.toString();
      if (user.role !== 'system_admin' && !canAccessCompany(user, userCompanyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const body = await req.json();
      
      // Validation schema
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(['system_admin', 'group_admin', 'company_admin', 'contract_manager', 'legal_reviewer', 'viewer']).optional(),
        isActive: z.boolean().optional(),
        loggingEnabled: z.boolean().optional(),
        companyId: z.string().optional(),
        groupId: z.string().optional(),
        permissions: z.object({
          canEdit: z.boolean().optional(),
          canApprove: z.boolean().optional(),
          canDelete: z.boolean().optional(),
          canManageUsers: z.boolean().optional(),
          workspaces: z.array(z.string()).optional(),
        }).optional(),
      });

      const validatedData = updateSchema.parse(body);

      // Check if email is being changed and if it's already taken
      if (validatedData.email && validatedData.email !== targetUser.email) {
        const existingUser = await User.findOne({ email: validatedData.email.toLowerCase() });
        if (existingUser) {
          return NextResponse.json(
            { error: 'Email already in use' },
            { status: 400 }
          );
        }
      }

      // Update user
      if (validatedData.name) targetUser.name = validatedData.name;
      if (validatedData.email) targetUser.email = validatedData.email.toLowerCase();
      if (validatedData.role) targetUser.role = validatedData.role;
      if (validatedData.isActive !== undefined) targetUser.isActive = validatedData.isActive;
      if (validatedData.loggingEnabled !== undefined) targetUser.loggingEnabled = validatedData.loggingEnabled;
      if (validatedData.companyId) targetUser.companyId = new mongoose.Types.ObjectId(validatedData.companyId);
      if (validatedData.groupId) targetUser.groupId = new mongoose.Types.ObjectId(validatedData.groupId);
      if (validatedData.permissions) {
        targetUser.permissions = {
          ...targetUser.permissions,
          ...validatedData.permissions,
          workspaces: validatedData.permissions.workspaces
            ? validatedData.permissions.workspaces.map((wsId: string) => new mongoose.Types.ObjectId(wsId))
            : targetUser.permissions?.workspaces,
        };
      }

      await targetUser.save();

      // Log audit
      await AuditLog.create({
        userId: user.id,
        action: 'update_user',
        resourceType: 'user',
        resourceId: targetUser._id.toString(),
        details: { updatedFields: Object.keys(validatedData) },
      });

      const updatedUser = await User.findById(id)
        .select('-password')
        .populate('companyId', 'name')
        .populate('groupId', 'name')
        .lean();

      return NextResponse.json({ user: updatedUser });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete user (soft delete by setting isActive to false)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      // Only admins can delete users
      if (!['system_admin', 'group_admin', 'company_admin'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Prevent self-deletion
      if (id === user.id) {
        return NextResponse.json(
          { error: 'Cannot delete your own account' },
          { status: 400 }
        );
      }

      const targetUser = await User.findById(id);
      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user can access this user's company
      const userCompanyId = targetUser.companyId?.toString();
      if (user.role !== 'system_admin' && !canAccessCompany(user, userCompanyId)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Soft delete
      targetUser.isActive = false;
      await targetUser.save();

      // Log audit
      await AuditLog.create({
        userId: user.id,
        action: 'delete_user',
        resourceType: 'user',
        resourceId: targetUser._id.toString(),
        details: { email: targetUser.email, name: targetUser.name },
      });

      return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }
  })(req);
}


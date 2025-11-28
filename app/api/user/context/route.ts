import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Company from '@/lib/db/models/Company';
import Workspace from '@/lib/db/models/Workspace';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const userRole = user.role;
      const userCompanyId = new mongoose.Types.ObjectId(user.companyId);
      const userId = new mongoose.Types.ObjectId(user.id);

      // Fetch full user document to get permissions
      const fullUser = await User.findById(userId)
        .populate('companyId', 'name type')
        .populate('groupId', 'name type')
        .lean();

      if (!fullUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      let accessibleCompanies: any[] = [];
      let accessibleWorkspaces: any[] = [];

      if (userRole === 'system_admin') {
        // System admin can access all companies and workspaces
        accessibleCompanies = await Company.find({ isActive: true })
          .select('_id name type parentCompanyId')
          .lean();

        accessibleWorkspaces = await Workspace.find({ isActive: true })
          .select('_id name companyId')
          .populate('companyId', 'name')
          .lean();
      } else if (userRole === 'group_admin') {
        // Group admin can access their group company and all subsidiaries
        const userCompany = await Company.findById(userCompanyId).lean();
        
        if (userCompany && (userCompany as any).type === 'group') {
          // Get group company
          accessibleCompanies.push({
            _id: userCompany._id,
            name: (userCompany as any).name,
            type: (userCompany as any).type,
          });

          // Get all subsidiaries
          const subsidiaries = await Company.find({
            parentCompanyId: userCompanyId,
            isActive: true,
          })
            .select('_id name type parentCompanyId')
            .lean();

          accessibleCompanies.push(...subsidiaries);

          // Get all workspaces for group and subsidiaries
          const companyIds = [userCompanyId, ...subsidiaries.map((s: any) => s._id)];
          accessibleWorkspaces = await Workspace.find({
            companyId: { $in: companyIds },
            isActive: true,
          })
            .select('_id name companyId')
            .populate('companyId', 'name')
            .lean();
        } else {
          // Not a group company, just return the user's company
          accessibleCompanies.push({
            _id: userCompany?._id,
            name: (userCompany as any)?.name,
            type: (userCompany as any)?.type,
          });

          accessibleWorkspaces = await Workspace.find({
            companyId: userCompanyId,
            isActive: true,
          })
            .select('_id name companyId')
            .populate('companyId', 'name')
            .lean();
        }
      } else {
        // Regular users: only their company and assigned workspaces
        const userCompany = await Company.findById(userCompanyId).lean();
        
        if (userCompany) {
          accessibleCompanies.push({
            _id: userCompany._id,
            name: (userCompany as any).name,
            type: (userCompany as any).type,
          });
        }

        // Get workspaces from user permissions
        const userWorkspaceIds = (fullUser.permissions?.workspaces || []) as mongoose.Types.ObjectId[];
        
        if (userWorkspaceIds.length > 0) {
          accessibleWorkspaces = await Workspace.find({
            _id: { $in: userWorkspaceIds },
            isActive: true,
          })
            .select('_id name companyId')
            .populate('companyId', 'name')
            .lean();
        } else {
          // If no specific workspaces assigned, check if user has access to all workspaces in their company
          // This depends on your business logic - for now, return empty if no workspaces assigned
          accessibleWorkspaces = [];
        }
      }

      // Format response
      const companies = accessibleCompanies.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        type: c.type,
        parentCompanyId: c.parentCompanyId?.toString(),
      }));

      const workspaces = accessibleWorkspaces.map((w: any) => ({
        id: w._id.toString(),
        name: w.name,
        companyId: (w.companyId as any)?._id?.toString() || w.companyId?.toString(),
        companyName: (w.companyId as any)?.name || '',
      }));

      return NextResponse.json({
        companies,
        workspaces,
        defaultCompanyId: user.companyId,
      });
    } catch (error: any) {
      console.error('Error fetching user context:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user context' },
        { status: 500 }
      );
    }
  })(req);
}


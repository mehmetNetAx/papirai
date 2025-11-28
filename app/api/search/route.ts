import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { requireAuth } from '@/lib/auth/middleware';
import { getUserAccessibleWorkspaces, isUserLimitedToSingleWorkspace } from '@/lib/utils/context';
import mongoose from 'mongoose';

// GET - Search contracts
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const query = searchParams.get('q') || '';
      const workspaceId = searchParams.get('workspaceId');
      const status = searchParams.get('status');
      const contractType = searchParams.get('contractType');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      // Check if user is limited to single workspace
      const singleWorkspaceCheck = await isUserLimitedToSingleWorkspace(user);
      let effectiveWorkspaceId = workspaceId || user.selectedWorkspaceId;
      
      if (singleWorkspaceCheck.isLimited && singleWorkspaceCheck.workspaceId) {
        effectiveWorkspaceId = singleWorkspaceCheck.workspaceId.toString();
      }

      const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
      const userRole = user.role;

      // Build company filter
      let companyFilter: any = {};
      if (userRole === 'system_admin') {
        companyFilter = {};
      } else {
        companyFilter = { companyId: companyObjectId };
      }

      const searchQuery: any = {
        ...companyFilter,
        isActive: true,
      };

      // Text search
      if (query) {
        searchQuery.$text = { $search: query };
      }

      // Workspace filter
      if (effectiveWorkspaceId) {
        searchQuery.workspaceId = new mongoose.Types.ObjectId(effectiveWorkspaceId);
      } else if (userRole !== 'system_admin') {
        // For regular users, filter by accessible workspaces
        const accessibleWorkspaces = await getUserAccessibleWorkspaces(user, companyObjectId);
        if (accessibleWorkspaces.length > 0) {
          searchQuery.workspaceId = { $in: accessibleWorkspaces };
        }
      }

      if (status) {
        searchQuery.status = status;
      }

      if (contractType) {
        searchQuery.contractType = contractType;
      }

      if (startDate || endDate) {
        searchQuery.createdAt = {};
        if (startDate) {
          searchQuery.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          searchQuery.createdAt.$lte = new Date(endDate);
        }
      }

      const skip = (page - 1) * limit;

      const [contracts, total] = await Promise.all([
        Contract.find(searchQuery)
          .populate('workspaceId', 'name')
          .populate('createdBy', 'name email')
          .sort(query ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Contract.countDocuments(searchQuery),
      ]);

      return NextResponse.json({
        contracts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error searching contracts:', error);
      return NextResponse.json(
        { error: 'Failed to search contracts' },
        { status: 500 }
      );
    }
  })(req);
}


import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import Company from '@/lib/db/models/Company';
import User from '@/lib/db/models/User';
import { requireAuth } from '@/lib/auth/middleware';
import { contractSchema } from '@/lib/utils/validation';
import { canEditContract } from '@/lib/utils/permissions';
import { logAuditEvent } from '@/lib/services/audit';
import {
  isUserLimitedToSingleWorkspace,
  isUserLimitedToSingleContract,
  getUserAccessibleWorkspaces,
} from '@/lib/utils/context';
import mongoose from 'mongoose';

// GET - List contracts
const handleGet = requireAuth(async (req: NextRequest, user) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive'); // 'true', 'false', or null (all)
    const counterparty = searchParams.get('counterparty');
    const contractType = searchParams.get('contractType');

    // Convert companyId to ObjectId
    let companyObjectId: mongoose.Types.ObjectId;
    try {
      companyObjectId = new mongoose.Types.ObjectId(user.companyId);
    } catch (error) {
      console.error('[Contracts API] Invalid companyId format:', user.companyId);
      return NextResponse.json(
        { error: 'Invalid company ID' },
        { status: 400 }
      );
    }

    const userRole = (user as any).role || 'user';

    // Check if user is limited to single contract
    const singleContractCheck = await isUserLimitedToSingleContract(user);
    if (singleContractCheck.isLimited && singleContractCheck.contractId) {
      // User can only see one contract
      const contract = await Contract.findById(singleContractCheck.contractId)
        .populate('workspaceId', 'name')
        .populate('createdBy', 'name email')
        .lean();
      
      if (contract) {
        return NextResponse.json({ contracts: [contract] });
      } else {
        return NextResponse.json({ contracts: [] });
      }
    }

    // Check if user is limited to single workspace
    const singleWorkspaceCheck = await isUserLimitedToSingleWorkspace(user);
    let effectiveWorkspaceId = workspaceId || user.selectedWorkspaceId;
    
    if (singleWorkspaceCheck.isLimited && singleWorkspaceCheck.workspaceId) {
      // User can only access one workspace, override any selection
      effectiveWorkspaceId = singleWorkspaceCheck.workspaceId.toString();
    }

    // Build company filter based on user role (same logic as dashboard)
    let companyFilter: any = {};
    let effectiveCompanyId = user.selectedCompanyId || user.companyId;
    
    if (userRole === 'system_admin') {
      // System admin sees all contracts - no filtering by company or workspace
      companyFilter = {};
    } else if (userRole === 'group_admin') {
      // Group admin sees all contracts in their group
      const userCompany = await Company.findById(companyObjectId).lean();
      if (userCompany && (userCompany as any).type === 'group') {
        // Get all subsidiaries in the group
        const subsidiaries = await Company.find({
          parentCompanyId: companyObjectId,
          isActive: true,
        }).select('_id').lean();
        const companyIds = [companyObjectId, ...subsidiaries.map((s: any) => s._id)];
        companyFilter = { companyId: { $in: companyIds } };
      } else {
        companyFilter = { companyId: companyObjectId };
      }
    } else {
      // Regular users see only their company's contracts
      companyFilter = { companyId: companyObjectId };
    }

    // Build query
    let query: any = {
      ...companyFilter,
    };

    // Handle isActive filter
    // If isActive is explicitly provided, use it; otherwise show all (both active and archived)
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      if (isActive === 'true') {
        query.isActive = true;
      } else if (isActive === 'false') {
        query.isActive = false;
      }
      // If isActive is 'all' or not provided, don't filter by isActive (show all)
    }
    // If isActive is not provided, don't filter (show both active and archived)

    // Apply workspace filter
    // System admin sees all contracts regardless of workspace selection
    if (userRole === 'system_admin') {
      // System admin sees all - no workspace filter
    } else if (effectiveWorkspaceId) {
      query.workspaceId = new mongoose.Types.ObjectId(effectiveWorkspaceId);
    } else if (userRole !== 'group_admin') {
      // For regular users, filter by accessible workspaces
      const accessibleWorkspaces = await getUserAccessibleWorkspaces(user, companyObjectId);
      if (accessibleWorkspaces.length > 0) {
        query.workspaceId = { $in: accessibleWorkspaces };
      } else {
        // User has no accessible workspaces, also check assigned contracts
        const userId = new mongoose.Types.ObjectId(user.id);
        query.$or = [
          { workspaceId: { $in: [] } }, // No workspace access
          { assignedUsers: userId }, // But can see assigned contracts
        ];
      }
    }

    if (status) {
      query.status = status;
    }

    // Helper function to escape regex special characters and create partial match pattern
    const escapeRegex = (text: string) => {
      return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex characters
    };

    if (counterparty) {
      // Partial search: escape special characters and allow partial matches
      const escapedCounterparty = escapeRegex(counterparty);
      query.counterparty = { $regex: escapedCounterparty, $options: 'i' }; // Case-insensitive partial search
    }

    if (contractType) {
      // Partial search for contract type as well
      const escapedContractType = escapeRegex(contractType);
      query.contractType = { $regex: escapedContractType, $options: 'i' };
    }

    // Text search - search in title, content, counterparty, and contractType with partial matching
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { content: { $regex: escapedSearch, $options: 'i' } },
        { counterparty: { $regex: escapedSearch, $options: 'i' } },
        { contractType: { $regex: escapedSearch, $options: 'i' } },
      ];
      // Also try full-text search if available
      try {
        query.$text = { $search: search };
      } catch (error) {
        // If text index doesn't exist, continue with regex search
      }
    }

    // Count total contracts
    const totalCount = await Contract.countDocuments(query);
    console.log(`[Contracts API] Total contracts count: ${totalCount}`);
    console.log(`[Contracts API] User role: ${userRole}`);
    console.log(`[Contracts API] Company ObjectId: ${companyObjectId.toString()}`);

    // Fetch all contracts (no limit) with populate
    let contracts = await Contract.find(query)
      .populate({
        path: 'workspaceId',
        select: 'name',
        options: { strictPopulate: false }, // Don't fail if workspace doesn't exist
      })
      .populate({
        path: 'createdBy',
        select: 'name email',
        options: { strictPopulate: false }, // Don't fail if user doesn't exist
      })
      .populate({
        path: 'companyId',
        select: 'name',
        options: { strictPopulate: false }, // Don't fail if company doesn't exist
      })
      .populate({
        path: 'counterpartyId',
        select: 'name',
        options: { strictPopulate: false }, // Don't fail if counterparty company doesn't exist
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Filter contracts by access control (check assignedUsers for external users)
    const userId = new mongoose.Types.ObjectId(user.id);
    contracts = contracts.filter((contract: any) => {
      // If user is assigned to contract, they can see it
      const assignedUsers = contract.assignedUsers || [];
      const isAssigned = assignedUsers.some((uid: any) => {
        const uidObj = uid instanceof mongoose.Types.ObjectId ? uid : new mongoose.Types.ObjectId(uid);
        return uidObj.equals(userId);
      });
      
      if (isAssigned) {
        return true;
      }

      // Otherwise, check if contract is in accessible company/workspace
      return true; // Already filtered by query above
    });

    console.log(`[Contracts API] Found ${contracts.length} contracts`);

    return NextResponse.json({ contracts });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    );
  }
});

// POST - Create contract
const handlePost = requireAuth(async (req: NextRequest, user) => {
  try {
    await connectDB();

    const body = await req.json();
    const validatedData = contractSchema.parse(body);

    const contract = await Contract.create({
      ...validatedData,
      companyId: user.companyId,
      createdBy: user.id,
      status: 'draft',
    });

    // Automatically set startDate and endDate as master variables
    if (contract.startDate) {
      try {
        const { setMasterVariable } = await import('@/lib/services/master-variables');
        await setMasterVariable(
          contract._id.toString(),
          'startDate',
          contract.startDate,
          'Başlangıç Tarihi'
        );
      } catch (error) {
        console.error('Error setting startDate master variable:', error);
        // Don't fail the contract creation if master variable setting fails
      }
    }

    if (contract.endDate) {
      try {
        const { setMasterVariable } = await import('@/lib/services/master-variables');
        await setMasterVariable(
          contract._id.toString(),
          'endDate',
          contract.endDate,
          'Bitiş Tarihi'
        );
      } catch (error) {
        console.error('Error setting endDate master variable:', error);
        // Don't fail the contract creation if master variable setting fails
      }
    }

    await logAuditEvent({
      userId: user.id,
      action: 'create_contract',
      resourceType: 'contract',
      resourceId: contract._id.toString(),
      details: { title: contract.title },
    });

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating contract:', error);
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    );
  }
});

export const GET = handleGet;
export const POST = handlePost;


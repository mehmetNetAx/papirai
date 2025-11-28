import { AuthUser } from '@/lib/auth/middleware';
import mongoose from 'mongoose';
import Company from '@/lib/db/models/Company';
import Workspace from '@/lib/db/models/Workspace';
import Contract from '@/lib/db/models/Contract';
import User from '@/lib/db/models/User';

/**
 * Get all companies that a user can access
 */
export async function getUserAccessibleCompanies(user: AuthUser): Promise<mongoose.Types.ObjectId[]> {
  const userCompanyId = new mongoose.Types.ObjectId(user.companyId);
  const userRole = user.role;

  if (userRole === 'system_admin') {
    // System admin can access all companies
    const companies = await Company.find({ isActive: true }).select('_id').lean();
    return companies.map((c: any) => c._id);
  } else if (userRole === 'group_admin') {
    // Group admin can access their group and subsidiaries
    const userCompany = await Company.findById(userCompanyId).lean();
    
    if (userCompany && (userCompany as any).type === 'group') {
      const subsidiaries = await Company.find({
        parentCompanyId: userCompanyId,
        isActive: true,
      }).select('_id').lean();
      
      return [userCompanyId, ...subsidiaries.map((s: any) => s._id)];
    } else {
      return [userCompanyId];
    }
  } else {
    // Regular users can only access their own company
    return [userCompanyId];
  }
}

/**
 * Get all workspaces that a user can access for a specific company
 */
export async function getUserAccessibleWorkspaces(
  user: AuthUser,
  companyId: mongoose.Types.ObjectId | string
): Promise<mongoose.Types.ObjectId[]> {
  const companyObjectId = companyId instanceof mongoose.Types.ObjectId 
    ? companyId 
    : new mongoose.Types.ObjectId(companyId);
  
  const userRole = user.role;
  const userCompanyId = new mongoose.Types.ObjectId(user.companyId);

  // Check if user can access this company
  const accessibleCompanies = await getUserAccessibleCompanies(user);
  const canAccessCompany = accessibleCompanies.some(
    (cid) => cid.toString() === companyObjectId.toString()
  );

  if (!canAccessCompany) {
    return [];
  }

  if (userRole === 'system_admin' || userRole === 'group_admin') {
    // Admins can access all workspaces in accessible companies
    const workspaces = await Workspace.find({
      companyId: companyObjectId,
      isActive: true,
    }).select('_id').lean();
    
    return workspaces.map((w: any) => w._id);
  } else {
    // Regular users: check permissions.workspaces
    const fullUser = await User.findById(user.id)
      .select('permissions')
      .lean();

    if (!fullUser) {
      return [];
    }

    const userWorkspaceIds = (fullUser.permissions?.workspaces || []) as mongoose.Types.ObjectId[];
    
    // Filter to only workspaces in the specified company
    const workspaces = await Workspace.find({
      _id: { $in: userWorkspaceIds },
      companyId: companyObjectId,
      isActive: true,
    }).select('_id').lean();

    return workspaces.map((w: any) => w._id);
  }
}

/**
 * Check if a user can access a specific workspace
 */
export async function canUserAccessWorkspace(
  user: AuthUser,
  workspaceId: mongoose.Types.ObjectId | string
): Promise<boolean> {
  const workspaceObjectId = workspaceId instanceof mongoose.Types.ObjectId
    ? workspaceId
    : new mongoose.Types.ObjectId(workspaceId);

  const workspace = await Workspace.findById(workspaceObjectId).lean();
  
  if (!workspace || !workspace.isActive) {
    return false;
  }

  const accessibleWorkspaces = await getUserAccessibleWorkspaces(user, workspace.companyId);
  
  return accessibleWorkspaces.some(
    (wid) => wid.toString() === workspaceObjectId.toString()
  );
}

/**
 * Check if a user can access a specific contract
 */
export async function canUserAccessContract(
  user: AuthUser,
  contract: any
): Promise<boolean> {
  if (!contract || !contract.isActive) {
    return false;
  }

  const userRole = user.role;
  const userId = new mongoose.Types.ObjectId(user.id);
  const contractCompanyId = contract.companyId 
    ? (contract.companyId instanceof mongoose.Types.ObjectId 
        ? contract.companyId 
        : new mongoose.Types.ObjectId(contract.companyId))
    : null;

  if (!contractCompanyId) {
    return false;
  }

  // Check company access
  const accessibleCompanies = await getUserAccessibleCompanies(user);
  const canAccessCompany = accessibleCompanies.some(
    (cid) => cid.toString() === contractCompanyId.toString()
  );

  if (!canAccessCompany) {
    return false;
  }

  // Check workspace access if contract has a workspace
  if (contract.workspaceId) {
    const workspaceId = contract.workspaceId instanceof mongoose.Types.ObjectId
      ? contract.workspaceId
      : new mongoose.Types.ObjectId(contract.workspaceId);
    
    const canAccessWorkspace = await canUserAccessWorkspace(user, workspaceId);
    
    if (!canAccessWorkspace) {
      // Check if user is assigned to this specific contract
      const assignedUsers = contract.assignedUsers || [];
      const allowedEditors = contract.allowedEditors || [];
      
      const isAssigned = assignedUsers.some((uid: any) => {
        const uidObj = uid instanceof mongoose.Types.ObjectId ? uid : new mongoose.Types.ObjectId(uid);
        return uidObj.equals(userId);
      });

      const isAllowedEditor = allowedEditors.some((uid: any) => {
        const uidObj = uid instanceof mongoose.Types.ObjectId ? uid : new mongoose.Types.ObjectId(uid);
        return uidObj.equals(userId);
      });

      if (!isAssigned && !isAllowedEditor) {
        return false;
      }
    }
  }

  // Check if user is assigned to this specific contract (for external users)
  const assignedUsers = contract.assignedUsers || [];
  const isAssigned = assignedUsers.some((uid: any) => {
    const uidObj = uid instanceof mongoose.Types.ObjectId ? uid : new mongoose.Types.ObjectId(uid);
    return uidObj.equals(userId);
  });

  if (isAssigned) {
    return true;
  }

  // For regular users, check if they have access to the workspace
  if (contract.workspaceId) {
    return await canUserAccessWorkspace(user, contract.workspaceId);
  }

  // If no workspace, check company access
  return canAccessCompany;
}

/**
 * Get contracts that a user can access (for single-contract users)
 */
export async function getUserAssignedContracts(user: AuthUser): Promise<mongoose.Types.ObjectId[]> {
  const userId = new mongoose.Types.ObjectId(user.id);
  
  // Find contracts where user is in assignedUsers
  const contracts = await Contract.find({
    assignedUsers: userId,
    isActive: true,
  }).select('_id').lean();

  return contracts.map((c: any) => c._id);
}

/**
 * Check if user has access to only one workspace
 */
export async function isUserLimitedToSingleWorkspace(user: AuthUser): Promise<{
  isLimited: boolean;
  workspaceId: mongoose.Types.ObjectId | null;
}> {
  if (user.role === 'system_admin' || user.role === 'group_admin') {
    return { isLimited: false, workspaceId: null };
  }

  const fullUser = await User.findById(user.id)
    .select('permissions')
    .lean();

  if (!fullUser) {
    return { isLimited: false, workspaceId: null };
  }

  const userWorkspaceIds = (fullUser.permissions?.workspaces || []) as mongoose.Types.ObjectId[];

  if (userWorkspaceIds.length === 1) {
    return { isLimited: true, workspaceId: userWorkspaceIds[0] };
  }

  return { isLimited: false, workspaceId: null };
}

/**
 * Check if user has access to only one contract
 */
export async function isUserLimitedToSingleContract(user: AuthUser): Promise<{
  isLimited: boolean;
  contractId: mongoose.Types.ObjectId | null;
}> {
  const assignedContracts = await getUserAssignedContracts(user);
  
  if (assignedContracts.length === 1) {
    return { isLimited: true, contractId: assignedContracts[0] };
  }

  return { isLimited: false, contractId: null };
}


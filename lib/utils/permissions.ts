import { AuthUser } from '@/lib/auth/middleware';
import mongoose from 'mongoose';

export type Permission = 
  | 'view_contract'
  | 'edit_contract'
  | 'delete_contract'
  | 'approve_contract'
  | 'manage_users'
  | 'manage_companies'
  | 'manage_workspaces'
  | 'view_compliance'
  | 'manage_integrations'
  | 'export_contract'
  | 'import_contract';

const rolePermissions: Record<string, Permission[]> = {
  system_admin: [
    'view_contract',
    'edit_contract',
    'delete_contract',
    'approve_contract',
    'manage_users',
    'manage_companies',
    'manage_workspaces',
    'view_compliance',
    'manage_integrations',
    'export_contract',
    'import_contract',
  ],
  group_admin: [
    'view_contract',
    'edit_contract',
    'approve_contract',
    'manage_users',
    'manage_workspaces',
    'view_compliance',
    'export_contract',
    'import_contract',
  ],
  company_admin: [
    'view_contract',
    'edit_contract',
    'approve_contract',
    'manage_users',
    'manage_workspaces',
    'view_compliance',
    'export_contract',
    'import_contract',
  ],
  contract_manager: [
    'view_contract',
    'edit_contract',
    'export_contract',
    'import_contract',
  ],
  legal_reviewer: [
    'view_contract',
    'edit_contract',
    'approve_contract',
    'export_contract',
  ],
  viewer: [
    'view_contract',
    'export_contract',
  ],
};

export function hasPermission(user: AuthUser, permission: Permission): boolean {
  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(permission);
}

export function canAccessCompany(user: AuthUser, companyId: string | mongoose.Types.ObjectId): boolean {
  // Convert companyId to string for comparison
  const companyIdStr = companyId instanceof mongoose.Types.ObjectId 
    ? companyId.toString() 
    : String(companyId);
  
  if (user.role === 'system_admin') {
    return true;
  }

  if (user.role === 'group_admin' && user.groupId) {
    // Group admin can access their group and subsidiaries
    return user.companyId === companyIdStr || user.groupId === companyIdStr;
  }

  return user.companyId === companyIdStr;
}

export async function canAccessWorkspace(
  user: AuthUser,
  workspaceId: string | mongoose.Types.ObjectId,
  workspaceCompanyId?: string | mongoose.Types.ObjectId
): Promise<boolean> {
  // Import dynamically to avoid circular dependency
  const { canUserAccessWorkspace } = await import('@/lib/utils/context');
  return canUserAccessWorkspace(user, workspaceId);
}

export async function canViewContract(
  user: AuthUser,
  contractCompanyId: string | mongoose.Types.ObjectId | null | undefined,
  contractWorkspaceId?: string | mongoose.Types.ObjectId | null,
  contractCreatedBy?: string | mongoose.Types.ObjectId,
  allowedEditors?: (string | mongoose.Types.ObjectId)[],
  assignedUsers?: (string | mongoose.Types.ObjectId)[],
  contractId?: string | mongoose.Types.ObjectId // Optional: for checking ContractUserAssignment table
): Promise<boolean> {
  if (!hasPermission(user, 'view_contract')) {
    return false;
  }

  if (!contractCompanyId) {
    return false;
  }

  const companyIdStr = contractCompanyId instanceof mongoose.Types.ObjectId
    ? contractCompanyId.toString()
    : String(contractCompanyId);

  // Helper function to check if user is assigned to contract
  const checkUserAssignment = async (): Promise<boolean> => {
    // First, try to check ContractUserAssignment table if contractId is provided
    if (contractId) {
      try {
        const ContractUserAssignment = (await import('@/lib/db/models/ContractUserAssignment')).default;
        const userObjectId = new mongoose.Types.ObjectId(user.id);
        const contractObjectId = contractId instanceof mongoose.Types.ObjectId 
          ? contractId 
          : new mongoose.Types.ObjectId(contractId);
        
        const assignment = await ContractUserAssignment.findOne({
          contractId: contractObjectId,
          userId: userObjectId,
          isActive: true,
        }).lean();
        
        if (assignment) {
          return true;
        }
      } catch (error) {
        console.error('Error checking ContractUserAssignment:', error);
        // Fall back to assignedUsers array
      }
    }
    
    // Fallback: check assignedUsers array (for backward compatibility)
    if (assignedUsers && assignedUsers.length > 0) {
      const userObjectId = new mongoose.Types.ObjectId(user.id);
      const isAssigned = assignedUsers.some((uid: any) => {
        const uidObj = uid instanceof mongoose.Types.ObjectId ? uid : new mongoose.Types.ObjectId(uid);
        return uidObj.equals(userObjectId);
      });
      return isAssigned;
    }
    
    return false;
  };

  // Check company access
  if (!canAccessCompany(user, companyIdStr)) {
    // If user can't access company, check if they're assigned to the contract
    const isAssigned = await checkUserAssignment();
    if (isAssigned) {
      return true; // Assigned users can view even if from different company
    }
    return false;
  }

  // Check workspace access if contract has a workspace
  if (contractWorkspaceId) {
    const { canUserAccessWorkspace } = await import('@/lib/utils/context');
    const canAccess = await canUserAccessWorkspace(user, contractWorkspaceId);
    
    if (!canAccess) {
      // If user can't access workspace, check if they're assigned to the contract
      const isAssigned = await checkUserAssignment();
      if (isAssigned) {
        return true; // Assigned users can view even if from different workspace
      }
      return false;
    }
  }

  return true;
}

export function canEditContract(
  user: AuthUser,
  contractCompanyId: string | mongoose.Types.ObjectId | null | undefined,
  contractCreatedBy?: string | mongoose.Types.ObjectId,
  allowedEditors?: (string | mongoose.Types.ObjectId)[]
): boolean {
  if (!hasPermission(user, 'edit_contract')) {
    return false;
  }

  // If contractCompanyId is null or undefined, deny access
  if (!contractCompanyId) {
    console.warn('canEditContract: contractCompanyId is null or undefined');
    return false;
  }

  // Convert to string safely
  const companyIdStr = contractCompanyId instanceof mongoose.Types.ObjectId
    ? contractCompanyId.toString()
    : String(contractCompanyId);

  if (!canAccessCompany(user, companyIdStr)) {
    return false;
  }

  // If contract has specific allowedEditors, check if user is in that list
  if (allowedEditors && allowedEditors.length > 0) {
    const userObjectId = new mongoose.Types.ObjectId(user.id);
    const isAllowed = allowedEditors.some(editorId => {
      const editorObjectId = typeof editorId === 'string' 
        ? new mongoose.Types.ObjectId(editorId)
        : editorId;
      return editorObjectId.equals(userObjectId);
    });
    
    // If user is in allowedEditors, they can edit
    if (isAllowed) {
      return true;
    }
    
    // Even if not in allowedEditors, admins can still edit
    if (['system_admin', 'group_admin', 'company_admin'].includes(user.role)) {
      return true;
    }
    
    // If allowedEditors is set and user is not in it, they cannot edit
    return false;
  }

  // Contract managers can edit contracts in their company
  if (user.role === 'contract_manager' || user.role === 'legal_reviewer') {
    return true;
  }

  // Admins can edit any contract in their scope
  if (['system_admin', 'group_admin', 'company_admin'].includes(user.role)) {
    return true;
  }

  return false;
}

export function canApproveContract(
  user: AuthUser,
  contractCompanyId: string | mongoose.Types.ObjectId | null | undefined
): boolean {
  if (!hasPermission(user, 'approve_contract')) {
    return false;
  }

  if (!contractCompanyId) {
    return false;
  }

  return canAccessCompany(user, contractCompanyId.toString());
}

export function canDeleteContract(
  user: AuthUser,
  contractCompanyId: string | mongoose.Types.ObjectId | null | undefined
): boolean {
  if (!hasPermission(user, 'delete_contract')) {
    return false;
  }

  if (!contractCompanyId) {
    return false;
  }

  return canAccessCompany(user, contractCompanyId.toString());
}


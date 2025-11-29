import { AuthUser } from '@/lib/auth/middleware';
import Company from '@/lib/db/models/Company';
import { getUserAccessibleWorkspaces, isUserLimitedToSingleWorkspace } from '@/lib/utils/context';
import mongoose from 'mongoose';

/**
 * Build company and workspace filters for reports based on user context
 */
export async function buildReportFilters(user: AuthUser): Promise<{
  companyFilter: any;
  workspaceFilter: any;
}> {
  const userRole = user.role;
  const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
  const effectiveCompanyId = user.selectedCompanyId || user.companyId;
  const effectiveWorkspaceId = user.selectedWorkspaceId;

  let companyFilter: any = {};
  let workspaceFilter: any = {};

  // Check if user is limited to single workspace
  const singleWorkspaceCheck = await isUserLimitedToSingleWorkspace(user);
  let finalWorkspaceId = effectiveWorkspaceId;
  
  if (singleWorkspaceCheck.isLimited && singleWorkspaceCheck.workspaceId) {
    finalWorkspaceId = singleWorkspaceCheck.workspaceId.toString();
  }

  // Build company filter
  if (userRole === 'system_admin') {
    // System admin sees all - no filtering by company or workspace
    companyFilter = {};
  } else if (userRole === 'group_admin') {
    // Group admin sees all contracts in their group
    const userCompany = await Company.findById(companyObjectId).lean();
    if (userCompany && (userCompany as any).type === 'group') {
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

  // Build workspace filter
  // System admin sees all regardless of workspace selection
  if (userRole === 'system_admin') {
    // System admin sees all - no workspace filter
    workspaceFilter = {};
  } else if (finalWorkspaceId) {
    workspaceFilter = { workspaceId: new mongoose.Types.ObjectId(finalWorkspaceId) };
  } else if (userRole !== 'group_admin') {
    // For regular users, filter by accessible workspaces
    const accessibleWorkspaces = await getUserAccessibleWorkspaces(user, companyObjectId);
    if (accessibleWorkspaces.length > 0) {
      workspaceFilter = { workspaceId: { $in: accessibleWorkspaces } };
    }
  }

  return { companyFilter, workspaceFilter };
}


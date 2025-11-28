import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import { canAccessCompany } from '@/lib/utils/permissions';
import EditUserForm from '@/components/users/EditUserForm';
import mongoose from 'mongoose';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only admins can edit users
  if (!['system_admin', 'group_admin', 'company_admin'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  await connectDB();

  const { id } = await params;

  const user = await User.findById(id)
    .select('-password')
    .populate('companyId', 'name')
    .populate('groupId', 'name')
    .lean();

  if (!user) {
    redirect('/dashboard/users');
  }

  // Check if user can access this user's company
  const userCompanyId = (user as any).companyId?._id?.toString() || (user as any).companyId?.toString();
  if (session.user.role !== 'system_admin' && !canAccessCompany(session.user, userCompanyId)) {
    redirect('/dashboard/users');
  }

  // Get available companies for selection (only for system_admin)
  let companies: any[] = [];
  if (session.user.role === 'system_admin') {
    companies = await Company.find({ isActive: true })
      .select('name type')
      .sort({ name: 1 })
      .lean();
  }

  // Serialize user for client component
  const serializedUser = {
    _id: String(user._id),
    name: String(user.name || ''),
    email: String(user.email),
    role: String(user.role),
    isActive: Boolean(user.isActive),
    companyId: (user as any).companyId?._id ? String((user as any).companyId._id) : String(user.companyId),
    companyName: (user as any).companyId?.name || '',
    groupId: (user as any).groupId?._id ? String((user as any).groupId._id) : ((user as any).groupId ? String((user as any).groupId) : undefined),
    groupName: (user as any).groupId?.name || undefined,
    permissions: user.permissions ? {
      canEdit: Boolean(user.permissions.canEdit),
      canApprove: Boolean(user.permissions.canApprove),
      canDelete: Boolean(user.permissions.canDelete),
      canManageUsers: Boolean(user.permissions.canManageUsers),
      workspaces: user.permissions.workspaces ? user.permissions.workspaces.map((ws: any) => String(ws)) : [],
    } : undefined,
  };

  const serializedCompanies = companies.map((c: any) => ({
    _id: String(c._id),
    name: String(c.name),
    type: String(c.type),
  }));

  return (
    <EditUserForm
      user={serializedUser}
      companies={serializedCompanies}
      currentUserRole={session.user.role}
    />
  );
}


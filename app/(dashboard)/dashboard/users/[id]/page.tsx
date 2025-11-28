import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Workspace from '@/lib/db/models/Workspace';
import Contract from '@/lib/db/models/Contract';
import ContractUserAssignment from '@/lib/db/models/ContractUserAssignment';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { canAccessCompany } from '@/lib/utils/permissions';
import UserWorkspaceAssignment from '@/components/users/UserWorkspaceAssignment';
import UserContractAssignment from '@/components/users/UserContractAssignment';
import mongoose from 'mongoose';

function getRoleLabel(role: string): string {
  const roleMap: Record<string, string> = {
    system_admin: 'Sistem Yöneticisi',
    group_admin: 'Grup Yöneticisi',
    company_admin: 'Şirket Yöneticisi',
    contract_manager: 'Sözleşme Yöneticisi',
    legal_reviewer: 'Hukuk İnceleyici',
    viewer: 'Görüntüleyici',
  };
  return roleMap[role] || role;
}

function getRoleColor(role: string): string {
  const colorMap: Record<string, string> = {
    system_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    group_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    company_admin: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    contract_manager: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    legal_reviewer: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return colorMap[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only admins can view user details
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

  // Get workspaces assigned to this user
  const workspaceIds = (user as any).permissions?.workspaces || [];
  const workspaces = workspaceIds.length > 0
    ? await Workspace.find({ _id: { $in: workspaceIds } })
        .select('name companyId')
        .populate('companyId', 'name')
        .lean()
    : [];

  // Get contracts where this user is assigned (from ContractUserAssignment table)
  const userId = new mongoose.Types.ObjectId(id);
  const assignments = await ContractUserAssignment.find({
    userId,
    isActive: true,
  })
    .populate({
      path: 'contractId',
      select: '_id title status workspaceId companyId',
      populate: [
        { path: 'workspaceId', select: 'name' },
        { path: 'companyId', select: 'name' },
      ],
    })
    .sort({ assignedAt: -1 })
    .lean();

  const assignedContracts = assignments
    .map((assignment: any) => {
      const contract = assignment.contractId;
      if (!contract || !contract._id) return null;
      return {
        id: contract._id.toString(),
        title: contract.title,
        status: contract.status,
        workspaceId: (contract.workspaceId as any)?._id?.toString() || contract.workspaceId?.toString(),
        workspaceName: (contract.workspaceId as any)?.name || '',
        companyId: (contract.companyId as any)?._id?.toString() || contract.companyId?.toString(),
        companyName: (contract.companyId as any)?.name || '',
        assignedAt: assignment.assignedAt,
      };
    })
    .filter((contract): contract is NonNullable<typeof contract> => contract !== null);

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard/users">
                <Button variant="ghost" size="sm">
                  <span className="material-symbols-outlined text-lg mr-2">arrow_back</span>
                  Geri
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Kullanıcı Detayları
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user.name || user.email} kullanıcısının detaylı bilgileri
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href={`/dashboard/users/${id}/edit`}>
                <span className="material-symbols-outlined text-lg mr-2">edit</span>
                Düzenle
              </Link>
            </Button>
          </div>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-2xl">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{user.name || 'İsimsiz Kullanıcı'}</CardTitle>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                {user.isActive ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    Aktif
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                    Pasif
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">E-posta</p>
                <p className="text-gray-900 dark:text-white">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Rol</p>
                <Badge className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Şirket</p>
                <p className="text-gray-900 dark:text-white">
                  {(user as any).companyId?.name || 'Belirtilmemiş'}
                </p>
              </div>
              {(user as any).groupId && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Grup Şirketi</p>
                  <p className="text-gray-900 dark:text-white">
                    {(user as any).groupId?.name || 'Belirtilmemiş'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Durum</p>
                {user.isActive ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    Aktif
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                    Pasif
                  </Badge>
                )}
              </div>
              {user.lastLogin && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Son Giriş</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(user.lastLogin).toLocaleString('tr-TR')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Oluşturulma Tarihi</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Son Güncelleme</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(user.updatedAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>

            {/* Permissions */}
            {user.permissions && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">İzinler</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined ${
                        user.permissions.canEdit ? 'text-green-500' : 'text-gray-400'
                      }`}
                    >
                      {user.permissions.canEdit ? 'check_circle' : 'cancel'}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Düzenleme</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined ${
                        user.permissions.canApprove ? 'text-green-500' : 'text-gray-400'
                      }`}
                    >
                      {user.permissions.canApprove ? 'check_circle' : 'cancel'}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Onaylama</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined ${
                        user.permissions.canDelete ? 'text-green-500' : 'text-gray-400'
                      }`}
                    >
                      {user.permissions.canDelete ? 'check_circle' : 'cancel'}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Silme</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined ${
                        user.permissions.canManageUsers ? 'text-green-500' : 'text-gray-400'
                      }`}
                    >
                      {user.permissions.canManageUsers ? 'check_circle' : 'cancel'}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Kullanıcı Yönetimi</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workspace Assignments */}
        <UserWorkspaceAssignment 
          userId={id} 
          currentWorkspaces={workspaces.map((ws: any) => ({
            id: ws._id.toString(),
            name: ws.name,
            companyId: (ws.companyId as any)?._id?.toString() || ws.companyId?.toString(),
            companyName: (ws.companyId as any)?.name || '',
          }))}
          userCompanyId={userCompanyId}
        />

        {/* Contract Assignments */}
        <UserContractAssignment 
          userId={id}
          assignedContracts={assignedContracts}
        />
      </div>
    </div>
  );
}


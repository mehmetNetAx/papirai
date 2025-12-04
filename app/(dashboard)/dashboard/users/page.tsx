import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Workspace from '@/lib/db/models/Workspace';
import Contract from '@/lib/db/models/Contract';
import ContractUserAssignment from '@/lib/db/models/ContractUserAssignment';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UserSearchForm from '@/components/users/UserSearchForm';
import UserFilterDropdown from '@/components/users/UserFilterDropdown';
import UserActionsMenu from '@/components/users/UserActionsMenu';
import UserLoggingToggle from '@/components/users/UserLoggingToggle';
import mongoose from 'mongoose';
import HelpButton from '@/components/help/HelpButton';

interface PageProps {
  searchParams: Promise<{ 
    search?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}

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

function getStatusBadge(isActive: boolean) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
        <span className="size-1.5 rounded-full bg-green-500"></span>
        Aktif
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
        <span className="size-1.5 rounded-full bg-red-500"></span>
        Pasif
      </span>
    );
  }
}

export default async function UsersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only admins can access user management
  const isAdmin = ['system_admin', 'group_admin', 'company_admin'].includes(session.user.role);
  if (!isAdmin) {
    redirect('/dashboard');
  }

  await connectDB();

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 10;
  const skip = (page - 1) * limit;

  // Build query
  let query: any = {};

  // Filter by company for non-system admins
  if (session.user.role !== 'system_admin') {
    query.companyId = new mongoose.Types.ObjectId(session.user.companyId);
  }

  // Search filter
  if (params.search) {
    query.$or = [
      { name: { $regex: params.search, $options: 'i' } },
      { email: { $regex: params.search, $options: 'i' } },
    ];
  }

  // Role filter
  if (params.role && params.role !== 'all') {
    query.role = params.role;
  }

  // Status filter
  if (params.status && params.status !== 'all') {
    query.isActive = params.status === 'active';
  }

  // Get users with populated company
  const [users, totalUsers] = await Promise.all([
    User.find(query)
      .select('name email role isActive companyId permissions loggingEnabled')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  // Get workspace and contract information for each user
  const usersWithDetails = await Promise.all(
    users.map(async (user: any) => {
      try {
        const userId = user._id;
        
        // Get workspaces from permissions
        const workspaceIds = user.permissions?.workspaces || [];
        // Convert workspaceIds to ObjectId array if they're strings
        const workspaceObjectIds = workspaceIds.map((id: any) => 
          id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
        );
        const workspaces = workspaceObjectIds.length > 0
          ? await Workspace.find({ _id: { $in: workspaceObjectIds } })
              .select('name companyId')
              .populate('companyId', 'name')
              .lean()
          : [];

        // Get contracts where user is assigned (from ContractUserAssignment table)
        const assignments = await ContractUserAssignment.find({
          userId: new mongoose.Types.ObjectId(userId),
          isActive: true,
        })
          .populate({
            path: 'contractId',
            select: '_id title isActive',
            match: { isActive: true },
          })
          .limit(5) // Show only first 5
          .lean();

        const assignedContracts = assignments
          .map((assignment: any) => assignment.contractId)
          .filter((contract: any) => contract && contract._id)
          .map((contract: any) => ({
            _id: contract._id.toString(),
            title: contract.title,
          }));

        const totalAssignedContracts = await ContractUserAssignment.countDocuments({
          userId: new mongoose.Types.ObjectId(userId),
          isActive: true,
        });

        return {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          loggingEnabled: user.loggingEnabled || false,
          companyId: user.companyId ? {
            _id: (user.companyId as any)._id?.toString() || user.companyId.toString(),
            name: (user.companyId as any).name || 'Belirtilmemiş',
          } : null,
          workspaces: workspaces.map((ws: any) => ({
            _id: ws._id.toString(),
            name: ws.name,
            companyId: ws.companyId ? {
              _id: (ws.companyId as any)._id?.toString() || ws.companyId.toString(),
              name: (ws.companyId as any).name || 'Belirtilmemiş',
            } : null,
          })),
          assignedContracts,
          totalAssignedContracts,
        };
      } catch (error: any) {
        console.error(`[UsersPage] Error processing user ${user._id}:`, error);
        // Return user with minimal data if processing fails
        return {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          loggingEnabled: user.loggingEnabled || false,
          companyId: user.companyId ? {
            _id: (user.companyId as any)._id?.toString() || user.companyId.toString(),
            name: (user.companyId as any).name || 'Belirtilmemiş',
          } : null,
          workspaces: [],
          assignedContracts: [],
          totalAssignedContracts: 0,
        };
      }
    })
  );

  const totalPages = Math.ceil(totalUsers / limit);

  return (
    <div className="relative flex min-h-screen w-full bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10">
        <div className="mx-auto max-w-7xl">
          {/* Page Heading */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight tracking-tight">
                  Kullanıcı Yönetimi
                </p>
                <p className="text-gray-500 dark:text-[#92adc9] text-base font-normal leading-normal">
                  Organizasyonunuzdaki kullanıcıları, rollerini ve izinlerini yönetin.
                </p>
              </div>
              <HelpButton module="users" />
            </div>
            <Link href="/dashboard/users/invite">
              <Button className="flex items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark">
                <span className="material-symbols-outlined text-base">person_add</span>
                <span className="truncate">Kullanıcı Davet Et</span>
              </Button>
            </Link>
          </div>

          {/* ToolBar (Search and Filters) */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            {/* SearchBar */}
            <UserSearchForm />

            {/* Chips (Filters) */}
            <div className="flex items-center gap-3">
              <UserFilterDropdown
                name="role"
                label="Tüm Roller"
                options={[
                  { value: 'all', label: 'Tüm Roller' },
                  { value: 'system_admin', label: 'Sistem Yöneticisi' },
                  { value: 'group_admin', label: 'Grup Yöneticisi' },
                  { value: 'company_admin', label: 'Şirket Yöneticisi' },
                  { value: 'contract_manager', label: 'Sözleşme Yöneticisi' },
                  { value: 'legal_reviewer', label: 'Hukuk İnceleyici' },
                  { value: 'viewer', label: 'Görüntüleyici' },
                ]}
              />
              <UserFilterDropdown
                name="status"
                label="Tüm Durumlar"
                options={[
                  { value: 'all', label: 'Tüm Durumlar' },
                  { value: 'active', label: 'Aktif' },
                  { value: 'inactive', label: 'Pasif' },
                ]}
              />
            </div>
          </div>

          {/* User Table */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200/50 dark:divide-[#324d67]/50 table-fixed">
                <thead className="bg-gray-50/50 dark:bg-[#1f2e3d]">
                  <tr>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display"
                      scope="col"
                    >
                      Kullanıcı
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display"
                      scope="col"
                    >
                      E-posta
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display"
                      scope="col"
                    >
                      Roller
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display"
                      scope="col"
                    >
                      Şirket
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display"
                      scope="col"
                    >
                      Workspace(ler)
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display"
                      scope="col"
                    >
                      Sözleşmeler
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display"
                      scope="col"
                    >
                      Durum
                    </th>
                    {session.user.role === 'system_admin' && (
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display"
                        scope="col"
                      >
                        Loglama
                      </th>
                    )}
                    <th className="relative px-6 py-4 w-24" scope="col">
                      <span className="sr-only">İşlemler</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-[#324d67]/50 bg-white dark:bg-[#192633]">
                  {usersWithDetails.length > 0 ? (
                    usersWithDetails.map((user: any) => (
                      <tr key={user._id} className="hover:bg-gray-50/50 dark:hover:bg-[#1f2e3d] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold text-sm font-display">
                                  {(user.name || user.email || 'U')[0].toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white font-display">
                                {user.name || 'İsimsiz Kullanıcı'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                                user.role
                              )}`}
                            >
                              {getRoleLabel(user.role)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {user.companyId?.name || 'Belirtilmemiş'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {user.workspaces && user.workspaces.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.workspaces.slice(0, 2).map((ws: any) => (
                                <Badge key={ws._id} variant="outline" className="text-xs">
                                  {ws.name}
                                </Badge>
                              ))}
                              {user.workspaces.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.workspaces.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {user.totalAssignedContracts > 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap gap-1">
                                {user.assignedContracts.slice(0, 2).map((contract: any) => (
                                  <Link
                                    key={contract._id}
                                    href={`/dashboard/contracts/${contract._id}`}
                                    className="text-primary hover:underline text-xs truncate max-w-[150px]"
                                  >
                                    {contract.title}
                                  </Link>
                                ))}
                              </div>
                              {user.totalAssignedContracts > 2 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  +{user.totalAssignedContracts - 2} daha
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.isActive)}</td>
                        {session.user.role === 'system_admin' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <UserLoggingToggle 
                              userId={user._id} 
                              loggingEnabled={user.loggingEnabled || false}
                              compact={true}
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end">
                            <UserActionsMenu userId={user._id} userName={user.name || user.email} />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={session.user.role === 'system_admin' ? 9 : 8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Kullanıcı bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200/50 dark:border-[#324d67]/50 px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  {page > 1 && (
                    <Link
                      href={`/dashboard/users?page=${page - 1}${params.search ? `&search=${params.search}` : ''}${params.role ? `&role=${params.role}` : ''}${params.status ? `&status=${params.status}` : ''}`}
                      className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-dark px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Önceki
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/dashboard/users?page=${page + 1}${params.search ? `&search=${params.search}` : ''}${params.role ? `&role=${params.role}` : ''}${params.status ? `&status=${params.status}` : ''}`}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-dark px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Sonraki
                    </Link>
                  )}
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-400">
                      <span className="font-medium">{skip + 1}</span> -{' '}
                      <span className="font-medium">{Math.min(skip + limit, totalUsers)}</span> arası, toplam{' '}
                      <span className="font-medium">{totalUsers}</span> sonuç
                    </p>
                  </div>
                  <div>
                    <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                      {page > 1 && (
                        <Link
                          href={`/dashboard/users?page=${page - 1}${params.search ? `&search=${params.search}` : ''}${params.role ? `&role=${params.role}` : ''}${params.status ? `&status=${params.status}` : ''}`}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0"
                        >
                          <span className="sr-only">Önceki</span>
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </Link>
                      )}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <Link
                            key={pageNum}
                            href={`/dashboard/users?page=${pageNum}${params.search ? `&search=${params.search}` : ''}${params.role ? `&role=${params.role}` : ''}${params.status ? `&status=${params.status}` : ''}`}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:z-20 focus:outline-offset-0 ${
                              pageNum === page
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-white'
                                : 'text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            {pageNum}
                          </Link>
                        );
                      })}
                      {page < totalPages && (
                        <Link
                          href={`/dashboard/users?page=${page + 1}${params.search ? `&search=${params.search}` : ''}${params.role ? `&role=${params.role}` : ''}${params.status ? `&status=${params.status}` : ''}`}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0"
                        >
                          <span className="sr-only">Sonraki</span>
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </Link>
                      )}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}


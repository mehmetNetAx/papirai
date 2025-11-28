import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Workspace from '@/lib/db/models/Workspace';
import Contract from '@/lib/db/models/Contract';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import mongoose from 'mongoose';

interface PageProps {
  params: Promise<{ id: string }>;
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Taslak',
    in_review: 'İncelemede',
    pending_approval: 'Onay Bekliyor',
    approved: 'Onaylandı',
    pending_signature: 'İmza Bekliyor',
    executed: 'Yürürlükte',
    expired: 'Süresi Doldu',
    terminated: 'Feshedildi',
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    pending_signature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    executed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

export default async function WorkspaceDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  await connectDB();

  // Convert string ID to ObjectId
  let workspaceObjectId: mongoose.Types.ObjectId;
  try {
    workspaceObjectId = new mongoose.Types.ObjectId(id);
  } catch (error) {
    redirect('/dashboard/workspaces');
  }

  // Fetch workspace with populated fields
  const workspace = await Workspace.findById(workspaceObjectId)
    .populate('createdBy', 'name email')
    .populate('companyId', 'name')
    .lean();

  if (!workspace || !workspace.isActive) {
    redirect('/dashboard/workspaces');
  }

  // Check access permission
  const companyObjectId = new mongoose.Types.ObjectId(session.user.companyId);
  const userRole = session.user.role;
  let hasAccess = false;

  if (userRole === 'system_admin') {
    hasAccess = true;
  } else if (userRole === 'group_admin') {
    const userCompany = await Company.findById(companyObjectId).lean();
    if (userCompany && (userCompany as any).type === 'group') {
      const subsidiaries = await Company.find({
        parentCompanyId: companyObjectId,
        isActive: true,
      }).select('_id').lean();
      const companyIds = [companyObjectId, ...subsidiaries.map((s: any) => s._id)];
      hasAccess = companyIds.some((cid: any) => cid.toString() === (workspace.companyId as any)._id.toString());
    } else {
      hasAccess = (workspace.companyId as any)._id.toString() === companyObjectId.toString();
    }
  } else {
    hasAccess = (workspace.companyId as any)._id.toString() === companyObjectId.toString();
  }

  if (!hasAccess) {
    redirect('/dashboard/workspaces');
  }

  // Fetch contracts in this workspace
  const contracts = await Contract.find({
    workspaceId: workspaceObjectId,
    isActive: true,
  })
    .populate('createdBy', 'name email')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  // Calculate statistics
  const stats = {
    total: contracts.length,
    draft: contracts.filter((c: any) => c.status === 'draft').length,
    inReview: contracts.filter((c: any) => c.status === 'in_review').length,
    pendingApproval: contracts.filter((c: any) => c.status === 'pending_approval').length,
    approved: contracts.filter((c: any) => c.status === 'approved').length,
    executed: contracts.filter((c: any) => c.status === 'executed').length,
    expired: contracts.filter((c: any) => c.status === 'expired').length,
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard/workspaces"
                className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                {workspace.name}
              </h1>
            </div>
            {workspace.description && (
              <p className="text-gray-600 dark:text-gray-400">{workspace.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/contracts/new?workspaceId=${id}`}>
                <span className="material-symbols-outlined text-lg mr-2">add</span>
                Yeni Sözleşme
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Toplam</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draft}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Taslak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inReview}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">İncelemede</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApproval}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Onay Bekliyor</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Onaylandı</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.executed}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Yürürlükte</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expired}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Süresi Doldu</div>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Contracts List */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sözleşmeler ({contracts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {contracts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Bu çalışma alanında henüz sözleşme yok.
                    </p>
                    <Button asChild>
                      <Link href={`/dashboard/contracts/new?workspaceId=${id}`}>
                        <span className="material-symbols-outlined text-lg mr-2">add</span>
                        Yeni Sözleşme Oluştur
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contracts.map((contract: any) => (
                      <Link
                        key={contract._id.toString()}
                        href={`/dashboard/contracts/${contract._id}`}
                        className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                              {contract.title}
                            </h3>
                            <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-base">person</span>
                                {(contract.createdBy as any)?.name || 'Bilinmeyen'}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-base">schedule</span>
                                {contract.updatedAt
                                  ? new Date(contract.updatedAt).toLocaleDateString('tr-TR', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : 'Tarih yok'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(
                                contract.status
                              )}`}
                            >
                              {getStatusLabel(contract.status)}
                            </span>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Workspace Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Çalışma Alanı Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Şirket</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(workspace.companyId as any)?.name || 'Belirtilmemiş'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Oluşturan</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(workspace.createdBy as any)?.name || 'Bilinmeyen'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Oluşturulma Tarihi</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {workspace.createdAt
                      ? new Date(workspace.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Tarih yok'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


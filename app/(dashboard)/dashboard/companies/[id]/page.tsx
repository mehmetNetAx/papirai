import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Company from '@/lib/db/models/Company';
import Workspace from '@/lib/db/models/Workspace';
import User from '@/lib/db/models/User';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { canAccessCompany } from '@/lib/utils/permissions';
import mongoose from 'mongoose';
import EditCompanyForm from './EditCompanyForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only admins can view company details
  if (!['system_admin', 'group_admin', 'company_admin'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  await connectDB();

  // Convert string ID to ObjectId
  let companyObjectId: mongoose.Types.ObjectId;
  try {
    companyObjectId = new mongoose.Types.ObjectId(id);
  } catch (error) {
    redirect('/dashboard/companies');
  }

  // Fetch company with populated fields
  const company = await Company.findById(companyObjectId)
    .populate('parentCompanyId', 'name')
    .lean();

  if (!company || !company.isActive) {
    redirect('/dashboard/companies');
  }

  // Check access
  const companyId = (company as any)._id.toString();
  if (session.user.role !== 'system_admin' && !canAccessCompany(session.user, companyId)) {
    redirect('/dashboard/companies');
  }

  // Fetch related data
  const [workspaces, users, subsidiaries] = await Promise.all([
    Workspace.find({ companyId: companyObjectId, isActive: true })
      .populate('createdBy', 'name')
      .sort({ name: 1 })
      .lean(),
    User.find({ companyId: companyObjectId, isActive: true })
      .select('name email role')
      .sort({ name: 1 })
      .lean(),
    company.type === 'group'
      ? Company.find({ parentCompanyId: companyObjectId, isActive: true })
          .sort({ name: 1 })
          .lean()
      : Promise.resolve([]),
  ]);

  const canEdit = ['system_admin', 'group_admin'].includes(session.user.role);

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard/companies"
                className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                {company.name}
              </h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant={company.type === 'group' ? 'default' : 'secondary'}
                className="text-sm"
              >
                {company.type === 'group' ? 'Grup Şirketi' : 'Alt Şirket'}
              </Badge>
              {company.parentCompanyId && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Ana Şirket: {(company.parentCompanyId as any).name}
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/companies/${id}/edit`}>
                <span className="material-symbols-outlined text-lg mr-2">edit</span>
                Düzenle
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Company Details */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                Şirket Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Şirket Adı</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{company.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Şirket Tipi</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {company.type === 'group' ? 'Grup Şirketi' : 'Alt Şirket'}
                </p>
              </div>
              {company.parentCompanyId && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ana Şirket</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {(company.parentCompanyId as any).name}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Durum</p>
                <Badge
                  variant={company.isActive ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {company.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Oluşturulma Tarihi</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {company.createdAt
                    ? new Date(company.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Bilinmiyor'}
                </p>
              </div>
              {company.settings && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Ayarlar</p>
                  <div className="space-y-2">
                    {company.settings.allowSelfRegistration !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Kendi Kendine Kayıt:
                        </span>
                        <Badge variant={company.settings.allowSelfRegistration ? 'default' : 'secondary'}>
                          {company.settings.allowSelfRegistration ? 'Açık' : 'Kapalı'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workspaces */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                Çalışma Alanları ({workspaces.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspaces.length > 0 ? (
                <div className="space-y-2">
                  {workspaces.map((workspace: any) => (
                    <Link
                      key={workspace._id.toString()}
                      href={`/dashboard/workspaces/${workspace._id}`}
                      className="block p-3 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50 hover:bg-gray-50/50 dark:hover:bg-[#1f2e3d] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {workspace.name}
                          </p>
                          {workspace.createdBy && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Oluşturan: {(workspace.createdBy as any).name}
                            </p>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Bu şirket için henüz çalışma alanı bulunmuyor
                </p>
              )}
            </CardContent>
          </Card>

          {/* Users */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                Kullanıcılar ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user: any) => (
                    <Link
                      key={user._id.toString()}
                      href={`/dashboard/users/${user._id}`}
                      className="block p-3 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50 hover:bg-gray-50/50 dark:hover:bg-[#1f2e3d] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {user.email} • {user.role}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Bu şirket için henüz kullanıcı bulunmuyor
                </p>
              )}
            </CardContent>
          </Card>

          {/* Subsidiaries (only for group companies) */}
          {company.type === 'group' && subsidiaries.length > 0 && (
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                  Alt Şirketler ({subsidiaries.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subsidiaries.map((subsidiary: any) => (
                    <Link
                      key={subsidiary._id.toString()}
                      href={`/dashboard/companies/${subsidiary._id}`}
                      className="block p-3 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50 hover:bg-gray-50/50 dark:hover:bg-[#1f2e3d] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {subsidiary.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Alt Şirket
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


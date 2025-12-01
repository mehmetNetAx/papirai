import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import Contract from '@/lib/db/models/Contract';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import ComplianceFilterDropdown from '@/components/compliance/ComplianceFilterDropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import mongoose from 'mongoose';
import HelpButton from '@/components/help/HelpButton';

interface PageProps {
  searchParams: Promise<{
    status?: string;
    alertLevel?: string;
    page?: string;
  }>;
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    compliant: 'Uyumlu',
    non_compliant: 'Uyumsuz',
    warning: 'Uyarı',
    pending: 'Beklemede',
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    compliant: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    non_compliant: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

function getAlertLevelLabel(level: string): string {
  const levelMap: Record<string, string> = {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
    critical: 'Kritik',
  };
  return levelMap[level] || level;
}

function getAlertLevelColor(level: string): string {
  const colorMap: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };
  return colorMap[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

export default async function CompliancePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  await connectDB();

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 10;
  const skip = (page - 1) * limit;

  // Convert string ID to ObjectId for MongoDB query
  const companyObjectId = new mongoose.Types.ObjectId(session.user.companyId);
  const userRole = session.user.role;

  // Build company filter based on user role
  let companyFilter: any = {};
  
  if (userRole === 'system_admin') {
    // System admin sees all contracts
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
  let query: any = {};

  // Get user's company contracts
  const userContracts = await Contract.find({
    ...companyFilter,
    isActive: true,
  }).select('_id').lean();

  // Only add contractId filter if there are contracts
  if (userContracts.length > 0) {
    query.contractId = { $in: userContracts.map((c: any) => c._id) };
  } else {
    // If no contracts, return empty result
    query.contractId = { $in: [] };
  }

  // Status filter
  if (params.status && params.status !== 'all') {
    query.status = params.status;
  }

  // Alert level filter
  if (params.alertLevel && params.alertLevel !== 'all') {
    query.alertLevel = params.alertLevel;
  }

  // Get compliance checks
  const [checks, totalChecks] = await Promise.all([
    ComplianceCheck.find(query)
      .populate('contractId', 'title')
      .populate('variableId', 'name type')
      .sort({ checkedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ComplianceCheck.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalChecks / limit);

  // Get summary stats
  const [totalChecksCount, compliantCount, nonCompliantCount, warningCount, criticalCount] = await Promise.all([
    ComplianceCheck.countDocuments({ contractId: { $in: userContracts.map((c: any) => c._id) } }),
    ComplianceCheck.countDocuments({ contractId: { $in: userContracts.map((c: any) => c._id) }, status: 'compliant' }),
    ComplianceCheck.countDocuments({ contractId: { $in: userContracts.map((c: any) => c._id) }, status: 'non_compliant' }),
    ComplianceCheck.countDocuments({ contractId: { $in: userContracts.map((c: any) => c._id) }, status: 'warning' }),
    ComplianceCheck.countDocuments({ contractId: { $in: userContracts.map((c: any) => c._id) }, alertLevel: 'critical' }),
  ]);

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Heading */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">Uyum Yönetimi</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
                Sözleşmelerinizin uyum durumunu izleyin ve yönetin.
              </p>
            </div>
            <HelpButton module="compliance" />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide mb-2">Toplam Kontrol</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white font-display tracking-tight">{totalChecksCount}</p>
            </CardContent>
          </Card>
          <Card className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide mb-2">Uyumlu</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 font-display tracking-tight">{compliantCount}</p>
            </CardContent>
          </Card>
          <Card className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-color-accent/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide mb-2">Uyumsuz</p>
              <p className="text-3xl font-bold text-color-accent font-display tracking-tight">{nonCompliantCount}</p>
            </CardContent>
          </Card>
          <Card className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide mb-2">Uyarı</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 font-display tracking-tight">{warningCount}</p>
            </CardContent>
          </Card>
          <Card className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-color-accent/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide mb-2">Kritik</p>
              <p className="text-3xl font-bold text-color-accent font-display tracking-tight">{criticalCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <ComplianceFilterDropdown
              name="status"
              options={[
                { value: 'all', label: 'Tüm Durumlar' },
                { value: 'compliant', label: 'Uyumlu' },
                { value: 'non_compliant', label: 'Uyumsuz' },
                { value: 'warning', label: 'Uyarı' },
                { value: 'pending', label: 'Beklemede' },
              ]}
            />
            <ComplianceFilterDropdown
              name="alertLevel"
              options={[
                { value: 'all', label: 'Tüm Seviyeler' },
                { value: 'low', label: 'Düşük' },
                { value: 'medium', label: 'Orta' },
                { value: 'high', label: 'Yüksek' },
                { value: 'critical', label: 'Kritik' },
              ]}
            />
          </div>
        </div>

        {/* Compliance Checks Table */}
        <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white font-display">Uyum Kontrolleri</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50 dark:divide-[#324d67]/50">
              <thead className="bg-gray-50/50 dark:bg-[#1f2e3d]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display" scope="col">
                    Sözleşme
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display" scope="col">
                    Değişken
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display" scope="col">
                    Beklenen Değer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display" scope="col">
                    Gerçek Değer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display" scope="col">
                    Durum
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display" scope="col">
                    Uyarı Seviyesi
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-display" scope="col">
                    Kontrol Tarihi
                  </th>
                  <th className="relative px-6 py-4" scope="col">
                    <span className="sr-only">İşlemler</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-[#324d67]/50 bg-white dark:bg-[#192633]">
                {checks.length > 0 ? (
                  checks.map((check: any) => (
                    <tr key={check._id.toString()} className="hover:bg-gray-50/50 dark:hover:bg-[#1f2e3d] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/contracts/${(check.contractId as any)?._id?.toString() || (check.contractId as any)?.toString() || ''}`}
                          className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors font-display"
                        >
                          {(check.contractId as any)?.title || 'Bilinmeyen Sözleşme'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {(check.variableId as any)?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {check.expectedValue 
                          ? (check.expectedValue instanceof Date 
                              ? check.expectedValue.toLocaleString('tr-TR')
                              : String(check.expectedValue))
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {check.actualValue 
                          ? (check.actualValue instanceof Date 
                              ? check.actualValue.toLocaleString('tr-TR')
                              : String(check.actualValue))
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(check.status)}`}>
                          {getStatusLabel(check.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {check.alertLevel && (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getAlertLevelColor(check.alertLevel)}`}>
                            {getAlertLevelLabel(check.alertLevel)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {check.checkedAt 
                          ? (check.checkedAt instanceof Date 
                              ? check.checkedAt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                              : new Date(check.checkedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }))
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/dashboard/contracts/${(check.contractId as any)?._id?.toString() || (check.contractId as any)?.toString() || ''}`}
                          className="text-primary hover:text-primary/80 hover:underline transition-colors font-display"
                        >
                          Görüntüle
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">Uyum kontrolü bulunamadı.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                {page > 1 && (
                  <Link
                    href={`/dashboard/compliance?page=${page - 1}${params.status ? `&status=${params.status}` : ''}${params.alertLevel ? `&alertLevel=${params.alertLevel}` : ''}`}
                    className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-dark px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Önceki
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/dashboard/compliance?page=${page + 1}${params.status ? `&status=${params.status}` : ''}${params.alertLevel ? `&alertLevel=${params.alertLevel}` : ''}`}
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
                    <span className="font-medium">{Math.min(skip + limit, totalChecks)}</span> arası, toplam{' '}
                    <span className="font-medium">{totalChecks}</span> sonuç
                  </p>
                </div>
                <div>
                  <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                    {page > 1 && (
                      <Link
                        href={`/dashboard/compliance?page=${page - 1}${params.status ? `&status=${params.status}` : ''}${params.alertLevel ? `&alertLevel=${params.alertLevel}` : ''}`}
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
                          href={`/dashboard/compliance?page=${pageNum}${params.status ? `&status=${params.status}` : ''}${params.alertLevel ? `&alertLevel=${params.alertLevel}` : ''}`}
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
                        href={`/dashboard/compliance?page=${page + 1}${params.status ? `&status=${params.status}` : ''}${params.alertLevel ? `&alertLevel=${params.alertLevel}` : ''}`}
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
    </div>
  );
}


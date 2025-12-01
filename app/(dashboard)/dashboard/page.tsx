import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import Approval from '@/lib/db/models/Approval';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import ContractVariable from '@/lib/db/models/ContractVariable';
import Company from '@/lib/db/models/Company';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import mongoose from 'mongoose';
import DashboardMetrics from './DashboardMetrics';
import DeadlineChecker from '@/components/contracts/DeadlineChecker';
import { getContractsNeedingAttention } from '@/lib/services/master-variables';
import { buildReportFilters } from '@/lib/utils/report-filters';
import HelpButton from '@/components/help/HelpButton';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return null;
  }

  await connectDB();

  const userId = session.user.id;
  const companyId = session.user.companyId;
  const userRole = session.user.role;

  // Convert string IDs to ObjectId for MongoDB queries
  let companyObjectId: mongoose.Types.ObjectId;
  let userObjectId: mongoose.Types.ObjectId;

  try {
    companyObjectId = new mongoose.Types.ObjectId(companyId);
    userObjectId = new mongoose.Types.ObjectId(userId);
  } catch (error) {
    console.error('Invalid ObjectId:', { companyId, userId, error });
    return (
      <div className="p-6 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">Dashboard</h1>
            <p className="text-color-accent mt-2">Hata: Geçersiz kullanıcı veya şirket ID'si</p>
          </div>
        </div>
      </div>
    );
  }

  // Get user context from request headers
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') || '';
  const request = new Request('http://localhost', {
    headers: { cookie: cookieHeader },
  });
  const user = await getAuthUser(request as any);
  
  // Build filters based on user context
  const { companyFilter, workspaceFilter } = user 
    ? await buildReportFilters(user)
    : { companyFilter: { companyId: companyObjectId }, workspaceFilter: {} };

  // Get contract IDs for related queries
  const contractIds = await Contract.find({ 
    ...companyFilter, 
    ...workspaceFilter,
    isActive: true 
  }).distinct('_id');

  // Get master variables stats
  const masterVariables = await ContractVariable.find({
    contractId: { $in: contractIds },
    isMaster: true,
  }).lean();

  // Calculate total contract value from master variables grouped by currency
  // Also include contracts with value from Contract model
  const contractValueVars = masterVariables.filter(v => v.masterType === 'contractValue');
  const currencyVars = masterVariables.filter(v => v.masterType === 'currency');
  
  // Create a map of contractId -> currency from master variables
  const currencyMap = new Map<string, string>();
  currencyVars.forEach(v => {
    const contractIdStr = v.contractId.toString();
    currencyMap.set(contractIdStr, (v.value as string) || 'TRY');
  });
  
  // Group contractValue by currency from master variables
  const totalsByCurrency = new Map<string, number>();
  contractValueVars.forEach(v => {
    const contractIdStr = v.contractId.toString();
    const currency = currencyMap.get(contractIdStr) || 'TRY';
    const val = typeof v.value === 'number' ? v.value : parseFloat(v.value as string) || 0;
    const currentTotal = totalsByCurrency.get(currency) || 0;
    totalsByCurrency.set(currency, currentTotal + val);
  });
  
  // Also add contracts with value from Contract model (if not already in master variables)
  const contractsWithValue = await Contract.find({
    ...companyFilter,
    isActive: true,
    value: { $exists: true, $ne: null },
  })
    .select('_id value currency')
    .lean();
  
  // Get contract IDs that have master variables
  const contractsWithMasterValue = new Set(
    contractValueVars.map(v => v.contractId.toString())
  );
  
  // Add contract values that don't have master variables
  contractsWithValue.forEach((c: any) => {
    const contractIdStr = c._id.toString();
    if (!contractsWithMasterValue.has(contractIdStr)) {
      const currency = c.currency || 'TRY';
      const val = typeof c.value === 'number' ? c.value : parseFloat(c.value as string) || 0;
      const currentTotal = totalsByCurrency.get(currency) || 0;
      totalsByCurrency.set(currency, currentTotal + val);
    }
  });
  
  // Convert to array format for display, sorted by total (descending)
  const totalContractValueByCurrency = Array.from(totalsByCurrency.entries())
    .map(([currency, total]) => ({
      currency,
      total,
    }))
    .sort((a, b) => b.total - a.total);
  
  // For backward compatibility, calculate a single total (use TRY if available, otherwise first currency)
  const totalContractValueFromMaster = totalsByCurrency.get('TRY') || 
    (totalsByCurrency.size > 0 ? Array.from(totalsByCurrency.values())[0] : 0);

  // Get contracts needing attention based on master variables
  const contractsNeedingAttention = await getContractsNeedingAttention(companyId);

  // Fetch dashboard stats
  const [
    totalContracts,
    pendingApprovals,
    complianceAlerts,
    recentContracts,
    totalContractValue,
    activeContracts,
    expiringSoonContracts,
    totalVariables,
    complianceTrackedVariables,
    masterVariablesCount,
  ] = await Promise.all([
    Contract.countDocuments({ ...companyFilter, isActive: true }),
    Approval.countDocuments({
      approverId: userObjectId,
      status: 'pending',
    }),
    contractIds.length === 0 ? 0 : ComplianceCheck.countDocuments({
      contractId: { $in: contractIds },
      status: { $in: ['non_compliant', 'warning'] },
      alertLevel: { $in: ['high', 'critical'] },
    }),
    Contract.find({ ...companyFilter, isActive: true })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title status updatedAt')
      .lean(),
    // Total contract value
    Contract.aggregate([
      { $match: { ...companyFilter, isActive: true, value: { $exists: true, $ne: null } } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]).then((result) => result[0]?.total || 0),
    // Active contracts (executed status)
    Contract.countDocuments({ ...companyFilter, isActive: true, status: 'executed' }),
    // Expiring soon (within next 30 days)
    Contract.countDocuments({
      ...companyFilter,
      isActive: true,
      endDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    }),
    // Total variables
    contractIds.length === 0 ? 0 : ContractVariable.countDocuments({
      contractId: { $in: contractIds },
    }),
    // Compliance tracked variables
    contractIds.length === 0 ? 0 : ContractVariable.countDocuments({
      contractId: { $in: contractIds },
      isComplianceTracked: true,
    }),
    // Master variables count
    contractIds.length === 0 ? 0 : ContractVariable.countDocuments({
      contractId: { $in: contractIds },
      isMaster: true,
    }),
  ]);

  const getStatusLabel = (status: string): string => {
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
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">Hoş geldiniz, {session.user.name}</p>
          </div>
          <HelpButton module="dashboard" />
        </div>

        {/* Stats Cards */}
        <DashboardMetrics
          metrics={{
            totalContracts,
            totalContractValue: totalContractValueFromMaster > 0 ? totalContractValueFromMaster : totalContractValue,
            totalContractValueByCurrency: totalContractValueByCurrency.length > 0 ? totalContractValueByCurrency : undefined,
            activeContracts,
            expiringSoonContracts,
            totalVariables,
            complianceTrackedVariables,
            pendingApprovals,
            complianceAlerts,
            masterVariablesCount,
            contractsNeedingAttention: contractsNeedingAttention.length,
          }}
        />

        {/* Deadline Checker */}
        <DeadlineChecker />

        {/* Contracts Needing Attention */}
        {contractsNeedingAttention.length > 0 && (
          <Card className="border border-orange-200/80 dark:border-orange-900/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white font-display">
                  Dikkat Gerektiren Sözleşmeler ({contractsNeedingAttention.length})
                </CardTitle>
                <Link
                  href="/dashboard/reports/master-variables"
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Tüm Raporlar →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contractsNeedingAttention.slice(0, 5).map((contract: any) => {
                  const getStatusColor = (status: string) => {
                    if (status === 'passed') {
                      return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
                    } else if (status === 'critical') {
                      return 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20';
                    } else if (status === 'warning') {
                      return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
                    }
                    return 'border-orange-100 dark:border-orange-900/30';
                  };

                  const getStatusTextColor = (status: string) => {
                    if (status === 'passed') {
                      return 'text-red-700 dark:text-red-400';
                    } else if (status === 'critical') {
                      return 'text-orange-700 dark:text-orange-400';
                    } else if (status === 'warning') {
                      return 'text-yellow-700 dark:text-yellow-400';
                    }
                    return 'text-orange-600 dark:text-orange-400';
                  };

                  return (
                    <Link
                      key={contract._id}
                      href={`/dashboard/contracts/${contract._id}`}
                      className={`flex items-start justify-between p-3 rounded-lg hover:opacity-90 transition-all duration-150 group border ${getStatusColor(contract.overallStatus || 'warning')}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-base font-display group-hover:text-primary dark:group-hover:text-primary transition-colors">
                          {contract.title}
                        </p>
                        <div className="mt-2 space-y-1">
                          {contract.alerts.map((alert: string, idx: number) => (
                            <p key={idx} className={`text-sm ${getStatusTextColor(contract.overallStatus || 'warning')}`}>
                              ⚠️ {alert}
                            </p>
                          ))}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {contractsNeedingAttention.length > 5 && (
                  <div className="text-center pt-2">
                    <Link
                      href="/dashboard/reports/master-variables"
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      +{contractsNeedingAttention.length - 5} sözleşme daha →
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports Quick Access Card */}
        <Card className="border border-blue-200/80 dark:border-blue-900/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white font-display">
                Master Değişken Raporları
              </CardTitle>
              <Link href="/dashboard/reports/master-variables">
                <Button variant="outline" size="sm">
                  <span className="material-symbols-outlined text-base mr-2">assessment</span>
                  Raporları Görüntüle
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Sözleşmelerin master değişken durumlarını kontrol edin, yaklaşan ve geçen tarihleri görüntüleyin.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {contractsNeedingAttention.filter((c: any) => c.overallStatus === 'passed' || c.alerts.some((a: string) => a.includes('geçti') || a.includes('doldu'))).length}
                </div>
                <div className="text-xs text-red-700 dark:text-red-400 mt-1">Geçen Tarihler</div>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {contractsNeedingAttention.filter((c: any) => c.overallStatus === 'critical' || c.alerts.some((a: string) => a.includes('Kritik'))).length}
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-400 mt-1">Kritik (7 gün)</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {contractsNeedingAttention.filter((c: any) => c.overallStatus === 'warning' || c.alerts.some((a: string) => a.includes('Uyarı'))).length}
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Uyarı (30 gün)</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {contractsNeedingAttention.length}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">Toplam Uyarı</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Contracts Card */}
        <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white font-display">Son Sözleşmeler</CardTitle>
          </CardHeader>
          <CardContent>
            {recentContracts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Henüz sözleşme yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentContracts.map((contract: any, index: number) => (
                  <Link
                    key={contract._id}
                    href={`/dashboard/contracts/${contract._id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f2e3d] transition-colors duration-150 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-base font-display group-hover:text-primary dark:group-hover:text-primary transition-colors truncate">
                        {contract.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(contract.updatedAt).toLocaleDateString('tr-TR', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <span className="ml-4 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0">
                      {getStatusLabel(contract.status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


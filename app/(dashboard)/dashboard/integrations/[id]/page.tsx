import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Integration from '@/lib/db/models/Integration';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { canAccessCompany } from '@/lib/utils/permissions';

function getIntegrationTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    sap: 'SAP',
    nebim: 'Nebim',
    logo: 'Logo',
    netsis: 'Netsis',
    custom: 'Özel',
  };
  return typeMap[type] || type;
}

function getIntegrationTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    sap: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    nebim: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    logo: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    netsis: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    custom: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return colorMap[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

function getStatusColor(status?: string): string {
  if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const colorMap: Record<string, string> = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

function getAlertLevelColor(level: string): string {
  const colorMap: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };
  return colorMap[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IntegrationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (!['system_admin', 'group_admin', 'company_admin'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  await connectDB();

  const { id } = await params;

  const integration = await Integration.findById(id)
    .populate('companyId', 'name')
    .populate('createdBy', 'name')
    .lean();

  if (!integration) {
    redirect('/dashboard/integrations');
  }

  // Check access
  const companyId = (integration as any).companyId?._id?.toString() || (integration as any).companyId?.toString();
  if (session.user.role !== 'system_admin' && !canAccessCompany(session.user, companyId)) {
    redirect('/dashboard/integrations');
  }

  // Get recent compliance checks from this integration
  const recentChecks = await ComplianceCheck.find({
    source: integration.type === 'sap' ? 'sap' : 'other_integration',
    sourceData: { $exists: true },
  })
    .populate('contractId', 'title')
    .populate('variableId', 'name type')
    .sort({ checkedAt: -1 })
    .limit(10)
    .lean();

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard/integrations">
                <Button variant="ghost" size="sm">
                  <span className="material-symbols-outlined text-lg mr-2">arrow_back</span>
                  Geri
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Entegrasyon Detayları
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {integration.name} entegrasyonunun detaylı bilgileri
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href={`/dashboard/integrations/${id}/edit`}>
                <span className="material-symbols-outlined text-lg mr-2">edit</span>
                Düzenle
              </Link>
            </Button>
          </div>
        </div>

        {/* Integration Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{integration.name}</CardTitle>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {(integration.companyId as any)?.name || 'Şirket bilgisi yok'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getIntegrationTypeColor(integration.type)}>
                  {getIntegrationTypeLabel(integration.type)}
                </Badge>
                {integration.isActive ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    Aktif
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    Pasif
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Entegrasyon Tipi</p>
                <Badge className={getIntegrationTypeColor(integration.type)}>
                  {getIntegrationTypeLabel(integration.type)}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Durum</p>
                {integration.isActive ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    Aktif
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    Pasif
                  </Badge>
                )}
              </div>
              {integration.config?.apiEndpoint && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">API Endpoint</p>
                  <p className="text-gray-900 dark:text-white break-all">{integration.config.apiEndpoint}</p>
                </div>
              )}
              {integration.config?.database && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Veritabanı</p>
                  <p className="text-gray-900 dark:text-white">{integration.config.database}</p>
                </div>
              )}
              {integration.lastSyncAt && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Son Senkronizasyon</p>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 dark:text-white">
                      {integration.lastSyncAt instanceof Date
                        ? integration.lastSyncAt.toLocaleString('tr-TR')
                        : new Date(integration.lastSyncAt).toLocaleString('tr-TR')}
                    </p>
                    {integration.lastSyncStatus && (
                      <Badge className={getStatusColor(integration.lastSyncStatus)}>
                        {integration.lastSyncStatus === 'success'
                          ? 'Başarılı'
                          : integration.lastSyncStatus === 'error'
                          ? 'Hata'
                          : 'Beklemede'}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {integration.schedule?.enabled && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Zamanlama</p>
                  <p className="text-gray-900 dark:text-white">
                    {integration.schedule.frequency === 'hourly' && 'Saatlik'}
                    {integration.schedule.frequency === 'daily' && 'Günlük'}
                    {integration.schedule.frequency === 'weekly' && 'Haftalık'}
                    {integration.schedule.frequency === 'monthly' && 'Aylık'}
                    {integration.schedule.time && ` - ${integration.schedule.time}`}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Oluşturulma Tarihi</p>
                <p className="text-gray-900 dark:text-white">
                  {integration.createdAt instanceof Date
                    ? integration.createdAt.toLocaleDateString('tr-TR')
                    : new Date(integration.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>

            {integration.lastSyncError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Son Hata</p>
                <p className="text-sm text-red-600 dark:text-red-400">{integration.lastSyncError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Compliance Checks */}
        {recentChecks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Son Compliance Kontrolleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentChecks.map((check: any) => (
                  <div
                    key={check._id.toString()}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getAlertLevelColor(check.alertLevel)}>
                            {check.alertLevel === 'critical'
                              ? 'Kritik'
                              : check.alertLevel === 'high'
                              ? 'Yüksek'
                              : check.alertLevel === 'medium'
                              ? 'Orta'
                              : 'Düşük'}
                          </Badge>
                          <Badge
                            className={
                              check.status === 'compliant'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                : check.status === 'non_compliant'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                            }
                          >
                            {check.status === 'compliant'
                              ? 'Uyumlu'
                              : check.status === 'non_compliant'
                              ? 'Uyumsuz'
                              : 'Uyarı'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {(check.contractId as any)?.title || 'Sözleşme bulunamadı'}
                        </p>
                        {check.variableId && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Değişken: {(check.variableId as any)?.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {check.checkedAt instanceof Date
                            ? check.checkedAt.toLocaleString('tr-TR')
                            : new Date(check.checkedAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/compliance?checkId=${check._id}`}>Detaylar</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


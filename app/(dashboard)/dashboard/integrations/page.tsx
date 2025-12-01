import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Integration from '@/lib/db/models/Integration';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import IntegrationActionsMenu from '@/components/integrations/IntegrationActionsMenu';
import mongoose from 'mongoose';
import HelpButton from '@/components/help/HelpButton';

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

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only admins can access integrations
  if (!['system_admin', 'group_admin', 'company_admin'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  await connectDB();

  // Build query based on user role
  let query: any = {};

  if (session.user.role !== 'system_admin') {
    // Non-system admins can only see their company's integrations
    query.companyId = new mongoose.Types.ObjectId(session.user.companyId);
  }

  const integrations = await Integration.find(query)
    .populate('companyId', 'name')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">Entegrasyonlar</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
                ERP sistemleri ile entegrasyonları yönetin ve compliance kontrollerini çalıştırın
              </p>
            </div>
            <HelpButton module="integrations" />
          </div>
          {['system_admin', 'group_admin', 'company_admin'].includes(session.user.role) && (
            <Button asChild className="button button-egg-blue">
              <Link href="/dashboard/integrations/new" className="flex items-center justify-center gap-2">
                
                <span>Yeni Entegrasyon</span>
              </Link>
            </Button>
          )}
        </div>

        {/* Integrations List */}
        {integrations.length === 0 ? (
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="py-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Henüz entegrasyon bulunmuyor.
                </p>
                <Button asChild className="button button-egg-blue">
                  <Link href="/dashboard/integrations/new">İlk Entegrasyonu Oluştur</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration: any) => (
              <Card 
                key={integration._id.toString()} 
                className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <CardHeader className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display mb-1">{integration.name}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {(integration.companyId as any)?.name || 'Şirket bilgisi yok'}
                      </p>
                    </div>
                    <IntegrationActionsMenu
                      integrationId={integration._id.toString()}
                      integrationName={integration.name}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
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

                  {integration.lastSyncAt && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Son Senkronizasyon</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {integration.lastSyncAt instanceof Date
                            ? integration.lastSyncAt.toLocaleString('tr-TR')
                            : new Date(integration.lastSyncAt).toLocaleString('tr-TR')}
                        </p>
                        {integration.lastSyncStatus && (
                          <Badge className={getStatusColor(integration.lastSyncStatus)}>
                            {integration.lastSyncStatus === 'success' ? 'Başarılı' : integration.lastSyncStatus === 'error' ? 'Hata' : 'Beklemede'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {integration.schedule?.enabled && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Zamanlama</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {integration.schedule.frequency === 'hourly' && 'Saatlik'}
                        {integration.schedule.frequency === 'daily' && 'Günlük'}
                        {integration.schedule.frequency === 'weekly' && 'Haftalık'}
                        {integration.schedule.frequency === 'monthly' && 'Aylık'}
                        {integration.schedule.time && ` - ${integration.schedule.time}`}
                      </p>
                    </div>
                  )}

                  {integration.lastSyncError && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                      {integration.lastSyncError}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200/50 dark:border-[#324d67]/50">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {integration.createdAt instanceof Date
                        ? integration.createdAt.toLocaleDateString('tr-TR')
                        : new Date(integration.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                    <Button variant="outline" size="sm" asChild className="shrink-0">
                      <Link href={`/dashboard/integrations/${integration._id}`} className="text-sm">
                        Detaylar
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


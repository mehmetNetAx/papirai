'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MetricDetailDialog from './MetricDetailDialog';

interface DashboardMetricsProps {
  metrics: {
    totalContracts: number;
    totalContractValue: number;
    totalContractValueByCurrency?: Array<{ currency: string; total: number }>;
    activeContracts: number;
    expiringSoonContracts: number;
    totalVariables: number;
    complianceTrackedVariables: number;
    pendingApprovals: number;
    complianceAlerts: number;
    masterVariablesCount?: number;
    contractsNeedingAttention?: number;
  };
}

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{
    type: 'totalValue' | 'totalContracts' | 'activeContracts' | 'expiringSoon' | 'totalVariables' | 'complianceTracked' | 'pendingApprovals' | 'complianceAlerts';
    title: string;
  } | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleMetricClick = async (
    type: 'totalValue' | 'totalContracts' | 'activeContracts' | 'expiringSoon' | 'totalVariables' | 'complianceTracked' | 'pendingApprovals' | 'complianceAlerts',
    title: string
  ) => {
    setSelectedMetric({ type, title });
    setLoading(true);
    setDialogOpen(true);

    try {
      const response = await fetch(`/api/dashboard/metric-details?type=${type}`);
      if (!response.ok) {
        throw new Error('Failed to fetch metric details');
      }
      const data = await response.json();
      setDetailData(data);
    } catch (error) {
      console.error('Error fetching metric details:', error);
      setDetailData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card 
          className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
          onClick={() => handleMetricClick('totalContracts', 'Toplam Sözleşme')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Toplam Sözleşme</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <div className="text-4xl font-bold text-gray-900 dark:text-white font-display tracking-tight">{metrics.totalContracts}</div>
          </CardContent>
        </Card>

        <Card 
          className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
          onClick={() => handleMetricClick('totalValue', 'Toplam Değer')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Toplam Değer</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <div className="space-y-2">
              {metrics.totalContractValueByCurrency && metrics.totalContractValueByCurrency.length > 0 ? (
                metrics.totalContractValueByCurrency.map((item, index) => (
                  <div key={item.currency} className={index === 0 ? "text-4xl font-bold text-gray-900 dark:text-white font-display tracking-tight" : "text-2xl font-semibold text-gray-700 dark:text-gray-300 font-display tracking-tight"}>
                    {new Intl.NumberFormat('tr-TR', { 
                      style: 'currency', 
                      currency: item.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(item.total)}
                  </div>
                ))
              ) : (
                <div className="text-4xl font-bold text-gray-900 dark:text-white font-display tracking-tight">
                  {metrics.totalContractValue > 0 
                    ? new Intl.NumberFormat('tr-TR', { 
                        style: 'currency', 
                        currency: 'TRY',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(metrics.totalContractValue)
                    : '₺0'
                  }
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
          onClick={() => handleMetricClick('activeContracts', 'Aktif Sözleşmeler')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Aktif Sözleşmeler</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <div className="text-4xl font-bold text-gray-900 dark:text-white font-display tracking-tight">{metrics.activeContracts}</div>
          </CardContent>
        </Card>

        <Card 
          className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
          onClick={() => handleMetricClick('expiringSoon', 'Yakında Sona Erecek')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Yakında Sona Erecek</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400 font-display tracking-tight">{metrics.expiringSoonContracts}</div>
          </CardContent>
        </Card>

        <Card 
          className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
          onClick={() => handleMetricClick('totalVariables', 'Toplam Değişken')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Toplam Değişken</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <div className="text-4xl font-bold text-gray-900 dark:text-white font-display tracking-tight">{metrics.totalVariables}</div>
          </CardContent>
        </Card>

        <Card 
          className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
          onClick={() => handleMetricClick('complianceTracked', 'Uyum Takibi')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Uyum Takibi</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 font-display tracking-tight">{metrics.complianceTrackedVariables}</div>
          </CardContent>
        </Card>

        <Card 
          className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
          onClick={() => handleMetricClick('pendingApprovals', 'Bekleyen Onaylar')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Bekleyen Onaylar</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <div className="text-4xl font-bold text-gray-900 dark:text-white font-display tracking-tight">{metrics.pendingApprovals}</div>
          </CardContent>
        </Card>

        <Card 
          className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
          onClick={() => handleMetricClick('complianceAlerts', 'Uyum Uyarıları')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-color-accent/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Uyum Uyarıları</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10">
            <div className="text-4xl font-bold text-color-accent font-display tracking-tight">{metrics.complianceAlerts}</div>
          </CardContent>
        </Card>

        {metrics.masterVariablesCount !== undefined && (
          <Card 
            className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardHeader className="pb-3 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Ana Değişkenler</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 relative z-10">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 font-display tracking-tight">{metrics.masterVariablesCount}</div>
            </CardContent>
          </Card>
        )}

        {metrics.contractsNeedingAttention !== undefined && metrics.contractsNeedingAttention > 0 && (
          <Card 
            className="group border border-orange-200/80 dark:border-orange-900/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative cursor-pointer hover:border-orange-500/50 dark:hover:border-orange-500/50"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardHeader className="pb-3 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 font-display uppercase tracking-wide">Dikkat Gerektiren</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 relative z-10">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 font-display tracking-tight">{metrics.contractsNeedingAttention}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedMetric && (
        <MetricDetailDialog
          metricType={selectedMetric.type}
          title={selectedMetric.title}
          contracts={detailData?.contracts || []}
          variables={detailData?.variables || []}
          approvals={detailData?.approvals || []}
          complianceChecks={detailData?.complianceChecks || []}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedMetric(null);
              setDetailData(null);
            }
          }}
        />
      )}
    </>
  );
}


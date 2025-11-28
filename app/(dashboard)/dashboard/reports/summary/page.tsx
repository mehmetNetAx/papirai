'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getStatusLabel, ContractStatus } from '@/lib/utils/contract-status';

interface SummaryReport {
  overview: {
    totalContracts: number;
    activeContracts: number;
    archivedContracts: number;
    totalValue: number;
    currencies: string[];
  };
  byStatus: Record<ContractStatus, number>;
  byDateStatus: {
    passed: number;
    critical: number;
    warning: number;
    normal: number;
    noDate: number;
  };
  financial: {
    totalByCurrency: Array<{
      currency: string;
      total: number;
      count: number;
    }>;
    averageValue: number;
  };
  compliance: {
    totalChecks: number;
    compliant: number;
    nonCompliant: number;
    warning: number;
    pending: number;
    trackedVariables: number;
  };
  recentActivity: Array<{
    _id: string;
    title: string;
    status: string;
    updatedAt: string;
  }>;
  topContracts: Array<{
    _id: string;
    title: string;
    contractValue: number;
    currency: string;
  }>;
}

export default function SummaryReportPage() {
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/summary');
      if (!response.ok) throw new Error('Failed to load report');
      const data = await response.json();
      setReport(data);
    } catch (error: any) {
      console.error('Error loading report:', error);
      alert('Rapor yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  const getStatusColor = (status: ContractStatus) => {
    const colors: Record<ContractStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      pending_signature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
      executed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[status] || colors.draft;
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Rapor yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Rapor yüklenemedi</p>
            <button onClick={loadReport} className="mt-4 px-4 py-2 bg-primary text-white rounded">
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allStatuses: ContractStatus[] = [
    'draft',
    'in_review',
    'pending_approval',
    'approved',
    'pending_signature',
    'executed',
    'expired',
    'terminated',
  ];

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard/reports"
                className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display">
                Genel Özet Raporu
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Tüm sözleşmelerin genel durumu, istatistikler ve özet bilgiler
            </p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Sözleşme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {report.overview.totalContracts}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {report.overview.activeContracts} aktif, {report.overview.archivedContracts} arşiv
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Aktif Sözleşmeler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{report.overview.activeContracts}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {report.overview.totalContracts > 0
                  ? ((report.overview.activeContracts / report.overview.totalContracts) * 100).toFixed(1)
                  : 0}
                % toplamın
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Değer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {report.overview.totalValue.toLocaleString('tr-TR')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {report.overview.currencies.join(', ')}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Ortalama Değer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(
                  report.financial.averageValue,
                  report.overview.currencies[0] || 'USD'
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <Card className="mb-8 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
          <CardHeader>
            <CardTitle>Durum Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {allStatuses.map((status) => {
                const count = report.byStatus[status] || 0;
                const percentage =
                  report.overview.totalContracts > 0
                    ? ((count / report.overview.totalContracts) * 100).toFixed(1)
                    : '0';

                return (
                  <div key={status} className="text-center">
                    <Badge className={`${getStatusColor(status)} mb-2`}>
                      {getStatusLabel(status)}
                    </Badge>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">%{percentage}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Date Status & Financial */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Date Status */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle>Bitiş Tarihi Durumları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Tarihi Geçti
                  </span>
                  <span className="text-xl font-bold text-red-900 dark:text-red-300">
                    {report.byDateStatus.passed}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                    1 Hafta İçinde
                  </span>
                  <span className="text-xl font-bold text-orange-900 dark:text-orange-300">
                    {report.byDateStatus.critical}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    1 Ay İçinde
                  </span>
                  <span className="text-xl font-bold text-yellow-900 dark:text-yellow-300">
                    {report.byDateStatus.warning}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Normal</span>
                  <span className="text-xl font-bold text-green-900 dark:text-green-300">
                    {report.byDateStatus.normal}
                  </span>
                </div>
                {report.byDateStatus.noDate > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                      Tarih Yok
                    </span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {report.byDateStatus.noDate}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle>Finansal Özet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.financial.totalByCurrency.map((item) => (
                  <div
                    key={item.currency}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.currency}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        ({item.count} sözleşme)
                      </span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(item.total, item.currency)}
                    </span>
                  </div>
                ))}
                {report.financial.totalByCurrency.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    Finansal veri bulunamadı
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Summary */}
        <Card className="mb-8 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
          <CardHeader>
            <CardTitle>Uyumluluk Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-900/20">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Kontrol</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.compliance.totalChecks}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-green-700 dark:text-green-400 mb-1">Uyumlu</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {report.compliance.compliant}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400 mb-1">Uyumsuz</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                  {report.compliance.nonCompliant}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">Uyarı</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                  {report.compliance.warning}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Takip Edilen</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                  {report.compliance.trackedVariables}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Contracts & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Contracts by Value */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle>En Değerli Sözleşmeler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.topContracts.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    Veri bulunamadı
                  </p>
                ) : (
                  report.topContracts.map((contract, index) => (
                    <Link
                      key={contract._id}
                      href={`/dashboard/contracts/${contract._id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-400 dark:text-gray-600">
                          #{index + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {contract.title}
                        </span>
                      </div>
                      <span className="font-bold text-primary">
                        {formatCurrency(contract.contractValue, contract.currency)}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle>Son Güncellemeler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.recentActivity.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    Aktivite bulunamadı
                  </p>
                ) : (
                  report.recentActivity.map((contract) => (
                    <Link
                      key={contract._id}
                      href={`/dashboard/contracts/${contract._id}`}
                      className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {contract.title}
                        </span>
                        <Badge className={getStatusColor(contract.status as ContractStatus)}>
                          {getStatusLabel(contract.status as ContractStatus)}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(contract.updatedAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


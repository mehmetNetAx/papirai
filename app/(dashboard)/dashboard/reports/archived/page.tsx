'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getStatusLabel, ContractStatus } from '@/lib/utils/contract-status';

interface ArchivedReport {
  summary: {
    totalArchived: number;
    byStatus: Record<ContractStatus, number>;
    totalValue: number;
    averageValue: number;
    oldestArchive: string | null;
    newestArchive: string | null;
  };
  contracts: Array<{
    _id: string;
    title: string;
    status: ContractStatus;
    archivedAt: string;
    archivedBy?: string;
    contractValue?: number;
    currency?: string;
    endDate?: string;
    counterparty?: string;
  }>;
  byStatus: Record<ContractStatus, number>;
  byYear: Array<{
    year: number;
    count: number;
  }>;
}

export default function ArchivedReportPage() {
  const [report, setReport] = useState<ArchivedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/archived');
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

  const filteredContracts = () => {
    if (!report) return [];
    let contracts = report.contracts;

    if (selectedStatus !== 'all') {
      contracts = contracts.filter((c) => c.status === selectedStatus);
    }

    if (selectedYear !== 'all') {
      contracts = contracts.filter((c) => {
        const year = new Date(c.archivedAt).getFullYear();
        return year === selectedYear;
      });
    }

    return contracts;
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
                Arşiv Raporu
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Arşive kaldırılmış sözleşmeler ve arşiv istatistikleri
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Arşivlenmiş
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {report.summary.totalArchived}
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
                {report.summary.totalValue.toLocaleString('tr-TR')}
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
                {report.summary.averageValue > 0
                  ? formatCurrency(report.summary.averageValue, 'USD')
                  : '-'}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Arşiv Tarihi Aralığı
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.summary.oldestArchive && report.summary.newestArchive ? (
                <div className="text-sm">
                  <p className="text-gray-900 dark:text-white">
                    {new Date(report.summary.oldestArchive).toLocaleDateString('tr-TR')}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">-</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(report.summary.newestArchive).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">-</p>
              )}
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
                  report.summary.totalArchived > 0
                    ? ((count / report.summary.totalArchived) * 100).toFixed(1)
                    : '0';

                return (
                  <div
                    key={status}
                    className={`text-center p-3 rounded-lg cursor-pointer transition-all ${
                      selectedStatus === status
                        ? 'ring-2 ring-primary bg-primary/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                    onClick={() => setSelectedStatus(selectedStatus === status ? 'all' : status)}
                  >
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

        {/* Year Distribution */}
        {report.byYear.length > 0 && (
          <Card className="mb-8 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle>Yıllara Göre Dağılım</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedYear('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedYear === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Tümü
                </button>
                {report.byYear.map((item) => (
                  <button
                    key={item.year}
                    onClick={() => setSelectedYear(item.year)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedYear === item.year
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.year} ({item.count})
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Durum Filtresi
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedStatus === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Tümü
              </button>
            </div>
          </div>
        </div>

        {/* Archived Contracts List */}
        <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
          <CardHeader>
            <CardTitle>
              Arşivlenmiş Sözleşmeler ({filteredContracts().length})
              {selectedStatus !== 'all' && (
                <Badge className={`ml-2 ${getStatusColor(selectedStatus)}`}>
                  {getStatusLabel(selectedStatus)}
                </Badge>
              )}
              {selectedYear !== 'all' && (
                <Badge variant="outline" className="ml-2">
                  {selectedYear}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredContracts().length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Bu kriterlere uygun arşivlenmiş sözleşme bulunamadı
                </p>
              ) : (
                filteredContracts().map((contract) => (
                  <Link
                    key={contract._id}
                    href={`/dashboard/contracts/${contract._id}`}
                    className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors opacity-75"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                            archive
                          </span>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {contract.title}
                          </h3>
                          <Badge className={getStatusColor(contract.status)}>
                            {getStatusLabel(contract.status)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Arşiv
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          {contract.counterparty && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Karşı Taraf: </span>
                              <span className="text-gray-900 dark:text-white">
                                {contract.counterparty}
                              </span>
                            </div>
                          )}
                          {contract.contractValue && contract.contractValue > 0 && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Değer: </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(contract.contractValue, contract.currency || 'USD')}
                              </span>
                            </div>
                          )}
                          {contract.endDate && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Bitiş Tarihi: </span>
                              <span className="text-gray-900 dark:text-white">
                                {new Date(contract.endDate).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Arşivlenme Tarihi:{' '}
                          {new Date(contract.archivedAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getStatusLabel, ContractStatus } from '@/lib/utils/contract-status';

interface StatusReport {
  status: ContractStatus;
  count: number;
  contracts: Array<{
    _id: string;
    title: string;
    status: ContractStatus;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function StatusReportPage() {
  const [reports, setReports] = useState<Record<ContractStatus, StatusReport>>({} as any);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | 'all'>('all');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/status');
      if (!response.ok) throw new Error('Failed to load reports');
      const data = await response.json();
      setReports(data);
    } catch (error: any) {
      console.error('Error loading reports:', error);
      alert('Raporlar yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
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

  const totalContracts = allStatuses.reduce((sum, status) => sum + (reports[status]?.count || 0), 0);

  if (loading) {
    return (
      <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Raporlar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

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
                Durum Raporu
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sözleşmelerin durumlarına göre dağılım ve detaylar
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          {allStatuses.map((status) => {
            const report = reports[status];
            const count = report?.count || 0;
            const percentage = totalContracts > 0 ? ((count / totalContracts) * 100).toFixed(1) : '0';

            return (
              <Card
                key={status}
                className={`border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] cursor-pointer hover:shadow-md transition-all ${
                  selectedStatus === status ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedStatus(selectedStatus === status ? 'all' : status)}
              >
                <CardContent className="p-4">
                  <div className="text-center">
                    <Badge className={`${getStatusColor(status)} mb-2 text-xs`}>
                      {getStatusLabel(status)}
                    </Badge>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">%{percentage}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Total Summary */}
        <Card className="mb-8 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
          <CardHeader>
            <CardTitle>Toplam Sözleşme Sayısı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{totalContracts}</p>
          </CardContent>
        </Card>

        {/* Contracts by Status */}
        <div className="space-y-6">
          {allStatuses
            .filter((status) => selectedStatus === 'all' || selectedStatus === status)
            .map((status) => {
              const report = reports[status];
              if (!report || report.count === 0) return null;

              return (
                <Card
                  key={status}
                  className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3">
                        <Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
                        <span className="text-gray-600 dark:text-gray-400">
                          ({report.count} sözleşme)
                        </span>
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {report.contracts.map((contract) => (
                        <Link
                          key={contract._id}
                          href={`/dashboard/contracts/${contract._id}`}
                          className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {contract.title}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(contract.updatedAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}


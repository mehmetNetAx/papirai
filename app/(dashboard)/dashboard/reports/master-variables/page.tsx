'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MasterVariableStatus } from '@/lib/services/master-variables';

interface MasterVariableStatusInfo {
  status: MasterVariableStatus;
  daysRemaining: number | null;
  message: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'gray';
  bgColor: string;
  textColor: string;
  borderColor: string;
}

interface ContractReport {
  _id: string;
  title: string;
  status: string;
  statuses: {
    endDate?: MasterVariableStatusInfo;
    terminationDeadline?: MasterVariableStatusInfo;
    renewalDate?: MasterVariableStatusInfo;
    overallStatus: MasterVariableStatus;
    hasAlerts: boolean;
  };
  endDate?: MasterVariableStatusInfo;
  terminationDeadline?: MasterVariableStatusInfo;
  renewalDate?: MasterVariableStatusInfo;
  overallStatus: MasterVariableStatus;
}

interface ReportsData {
  passed: ContractReport[];
  critical: ContractReport[];
  warning: ContractReport[];
  normal: ContractReport[];
  summary: {
    total: number;
    passed: number;
    critical: number;
    warning: number;
    normal: number;
  };
}

export default function MasterVariablesReportsPage() {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<MasterVariableStatus | 'all'>('all');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contracts/master-variables/reports');
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

  const getStatusBadge = (status: MasterVariableStatus) => {
    const badges = {
      passed: <Badge className="bg-red-500 text-white">Geçti</Badge>,
      critical: <Badge className="bg-orange-500 text-white">Kritik</Badge>,
      warning: <Badge className="bg-yellow-500 text-white">Uyarı</Badge>,
      normal: <Badge className="bg-green-500 text-white">Normal</Badge>,
    };
    return badges[status];
  };

  const getStatusColor = (status: MasterVariableStatus) => {
    const colors = {
      passed: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
      critical: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20',
      warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
      normal: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
    };
    return colors[status];
  };

  const filteredContracts = () => {
    if (!reports) return [];
    if (selectedFilter === 'all') {
      return [
        ...reports.passed,
        ...reports.critical,
        ...reports.warning,
        ...reports.normal,
      ];
    }
    return reports[selectedFilter];
  };

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

  if (!reports) {
    return (
      <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Raporlar yüklenemedi</p>
            <Button onClick={loadReports} className="mt-4">
              Tekrar Dene
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">
            Master Değişken Kontrol Raporları
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
            Sözleşmelerin master değişken durumlarını kontrol edin ve raporlayın
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {reports.summary.total}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Toplam Sözleşme</p>
            </CardContent>
          </Card>
          <Card className="border border-red-200/80 dark:border-red-900/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {reports.summary.passed}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Geçen Tarihler</p>
            </CardContent>
          </Card>
          <Card className="border border-orange-200/80 dark:border-orange-900/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {reports.summary.critical}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kritik (7 gün içinde)</p>
            </CardContent>
          </Card>
          <Card className="border border-yellow-200/80 dark:border-yellow-900/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {reports.summary.warning}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Uyarı (30 gün içinde)</p>
            </CardContent>
          </Card>
          <Card className="border border-green-200/80 dark:border-green-900/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {reports.summary.normal}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Normal</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={selectedFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('all')}
            size="sm"
          >
            Tümü ({reports.summary.total})
          </Button>
          <Button
            variant={selectedFilter === 'passed' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('passed')}
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Geçen ({reports.summary.passed})
          </Button>
          <Button
            variant={selectedFilter === 'critical' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('critical')}
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Kritik ({reports.summary.critical})
          </Button>
          <Button
            variant={selectedFilter === 'warning' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('warning')}
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Uyarı ({reports.summary.warning})
          </Button>
          <Button
            variant={selectedFilter === 'normal' ? 'default' : 'outline'}
            onClick={() => setSelectedFilter('normal')}
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Normal ({reports.summary.normal})
          </Button>
        </div>

        {/* Contracts List */}
        <div className="space-y-4">
          {filteredContracts().length === 0 ? (
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">Bu kategoride sözleşme bulunamadı</p>
              </CardContent>
            </Card>
          ) : (
            filteredContracts().map((contract) => (
              <Card
                key={contract._id}
                className={`border ${getStatusColor(contract.overallStatus)} shadow-sm rounded-xl hover:shadow-md transition-all duration-200`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <Link
                          href={`/dashboard/contracts/${contract._id}`}
                          className="text-lg font-semibold text-gray-900 dark:text-white font-display hover:text-primary dark:hover:text-primary transition-colors"
                        >
                          {contract.title}
                        </Link>
                        {getStatusBadge(contract.overallStatus)}
                      </div>

                      <div className="space-y-2">
                        {contract.endDate && (
                          <div className={`p-3 rounded-lg border ${contract.endDate.borderColor} ${contract.endDate.bgColor}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">Bitiş Tarihi</span>
                              <span className={`text-sm font-medium ${contract.endDate.textColor}`}>
                                {contract.endDate.message}
                              </span>
                            </div>
                          </div>
                        )}

                        {contract.terminationDeadline && (
                          <div className={`p-3 rounded-lg border ${contract.terminationDeadline.borderColor} ${contract.terminationDeadline.bgColor}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">Fesih Son Tarihi</span>
                              <span className={`text-sm font-medium ${contract.terminationDeadline.textColor}`}>
                                {contract.terminationDeadline.message}
                              </span>
                            </div>
                          </div>
                        )}

                        {contract.renewalDate && (
                          <div className={`p-3 rounded-lg border ${contract.renewalDate.borderColor} ${contract.renewalDate.bgColor}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">Yenileme Tarihi</span>
                              <span className={`text-sm font-medium ${contract.renewalDate.textColor}`}>
                                {contract.renewalDate.message}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


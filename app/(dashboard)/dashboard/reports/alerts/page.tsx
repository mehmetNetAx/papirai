'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { checkDateStatus, DateStatus } from '@/lib/utils/date-status';

interface AlertReport {
  summary: {
    total: number;
    passed: number;
    critical: number;
    warning: number;
    complianceIssues: number;
  };
  passed: Array<{
    _id: string;
    title: string;
    status: string;
    endDate?: string;
    terminationDeadline?: string;
    renewalDate?: string;
    daysRemaining: number | null;
    alerts: string[];
    overallStatus: DateStatus;
  }>;
  critical: Array<{
    _id: string;
    title: string;
    status: string;
    endDate?: string;
    terminationDeadline?: string;
    renewalDate?: string;
    daysRemaining: number | null;
    alerts: string[];
    overallStatus: DateStatus;
  }>;
  warning: Array<{
    _id: string;
    title: string;
    status: string;
    endDate?: string;
    terminationDeadline?: string;
    renewalDate?: string;
    daysRemaining: number | null;
    alerts: string[];
    overallStatus: DateStatus;
  }>;
  complianceIssues: Array<{
    _id: string;
    contractId: string;
    contractTitle: string;
    variableName: string;
    status: string;
    alertLevel: string;
    checkedAt: string;
  }>;
}

export default function AlertsReportPage() {
  const [report, setReport] = useState<AlertReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'passed' | 'critical' | 'warning' | 'compliance'>('all');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/alerts');
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

  const getStatusColor = (status: DateStatus) => {
    const colors = {
      passed: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800',
      critical: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      normal: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800',
    };
    return colors[status];
  };

  const getStatusLabel = (status: DateStatus) => {
    const labels = {
      passed: 'Tarihi Geçti',
      critical: 'Kritik (1 Hafta)',
      warning: 'Uyarı (1 Ay)',
      normal: 'Normal',
    };
    return labels[status];
  };

  const getStatusIcon = (status: DateStatus) => {
    const icons = {
      passed: '⚠️',
      critical: '🔴',
      warning: '🟠',
      normal: '🟢',
    };
    return icons[status];
  };

  const getAlertLevelColor = (level: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return colors[level as keyof typeof colors] || colors.medium;
  };

  const getAlertLevelLabel = (level: string) => {
    const labels = {
      low: 'Düşük',
      medium: 'Orta',
      high: 'Yüksek',
      critical: 'Kritik',
    };
    return labels[level as keyof typeof labels] || level;
  };

  const filteredContracts = () => {
    if (!report) return [];
    if (selectedFilter === 'all') {
      return [
        ...report.passed.map((c) => ({ ...c, category: 'passed' as const })),
        ...report.critical.map((c) => ({ ...c, category: 'critical' as const })),
        ...report.warning.map((c) => ({ ...c, category: 'warning' as const })),
      ];
    }
    if (selectedFilter === 'compliance') {
      return [];
    }
    return report[selectedFilter].map((c) => ({ ...c, category: selectedFilter }));
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
                Uyarı ve Bildirimler
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Dikkat gerektiren sözleşmeler, yaklaşan son tarihler ve kritik durumlar
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <Card
            className={`border-2 cursor-pointer hover:shadow-md transition-all ${
              selectedFilter === 'all'
                ? 'ring-2 ring-primary border-primary'
                : 'border-gray-200/80 dark:border-[#324d67]/50'
            } bg-white dark:bg-[#192633]`}
            onClick={() => setSelectedFilter('all')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tümü</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.summary.total}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-2 cursor-pointer hover:shadow-md transition-all ${
              selectedFilter === 'passed'
                ? 'ring-2 ring-red-500 border-red-500'
                : 'border-red-200 dark:border-red-800'
            } bg-red-50 dark:bg-red-900/20`}
            onClick={() => setSelectedFilter('passed')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-red-700 dark:text-red-400 mb-1">Tarihi Geçti</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                  {report.summary.passed}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-2 cursor-pointer hover:shadow-md transition-all ${
              selectedFilter === 'critical'
                ? 'ring-2 ring-orange-500 border-orange-500'
                : 'border-orange-200 dark:border-orange-800'
            } bg-orange-50 dark:bg-orange-900/20`}
            onClick={() => setSelectedFilter('critical')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-orange-700 dark:text-orange-400 mb-1">Kritik</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                  {report.summary.critical}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-2 cursor-pointer hover:shadow-md transition-all ${
              selectedFilter === 'warning'
                ? 'ring-2 ring-yellow-500 border-yellow-500'
                : 'border-yellow-200 dark:border-yellow-800'
            } bg-yellow-50 dark:bg-yellow-900/20`}
            onClick={() => setSelectedFilter('warning')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">Uyarı</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                  {report.summary.warning}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-2 cursor-pointer hover:shadow-md transition-all ${
              selectedFilter === 'compliance'
                ? 'ring-2 ring-purple-500 border-purple-500'
                : 'border-purple-200 dark:border-purple-800'
            } bg-purple-50 dark:bg-purple-900/20`}
            onClick={() => setSelectedFilter('compliance')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-purple-700 dark:text-purple-400 mb-1">Compliance</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                  {report.summary.complianceIssues}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts Needing Attention */}
        {selectedFilter !== 'compliance' && (
          <Card className="mb-8 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle>
                Dikkat Gerektiren Sözleşmeler ({filteredContracts().length})
                {selectedFilter !== 'all' && (
                  <Badge className={`ml-2 ${getStatusColor(selectedFilter as DateStatus)}`}>
                    {getStatusLabel(selectedFilter as DateStatus)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredContracts().length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Bu kriterlere uygun sözleşme bulunamadı
                  </p>
                ) : (
                  filteredContracts().map((contract) => (
                    <Link
                      key={contract._id}
                      href={`/dashboard/contracts/${contract._id}`}
                      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{getStatusIcon(contract.overallStatus)}</span>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {contract.title}
                            </h3>
                            <Badge className={getStatusColor(contract.overallStatus)}>
                              {getStatusLabel(contract.overallStatus)}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {contract.alerts.map((alert, index) => (
                              <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                                • {alert}
                              </p>
                            ))}
                          </div>
                          {contract.daysRemaining !== null && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {contract.daysRemaining > 0
                                ? `${contract.daysRemaining} gün kaldı`
                                : `${Math.abs(contract.daysRemaining)} gün geçti`}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compliance Issues */}
        {selectedFilter === 'compliance' && (
          <Card className="mb-8 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle>
                Compliance Sorunları ({report.complianceIssues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.complianceIssues.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Compliance sorunu bulunamadı
                  </p>
                ) : (
                  report.complianceIssues.map((issue) => (
                    <Link
                      key={issue._id}
                      href={`/dashboard/contracts/${issue.contractId}`}
                      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {issue.contractTitle}
                            </h3>
                            <Badge
                              className={
                                issue.status === 'non_compliant'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                  : issue.status === 'warning'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }
                            >
                              {issue.status === 'non_compliant'
                                ? 'Uyumsuz'
                                : issue.status === 'warning'
                                ? 'Uyarı'
                                : issue.status}
                            </Badge>
                            <Badge className={getAlertLevelColor(issue.alertLevel)}>
                              {getAlertLevelLabel(issue.alertLevel)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Değişken: <span className="font-medium">{issue.variableName}</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Kontrol Tarihi:{' '}
                            {new Date(issue.checkedAt).toLocaleDateString('tr-TR', {
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
        )}
      </div>
    </div>
  );
}


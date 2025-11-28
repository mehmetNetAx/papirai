'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type ComplianceStatus = 'compliant' | 'non_compliant' | 'warning' | 'pending';
type AlertLevel = 'low' | 'medium' | 'high' | 'critical';

interface ComplianceReport {
  summary: {
    totalChecks: number;
    compliant: number;
    nonCompliant: number;
    warning: number;
    pending: number;
    totalTrackedVariables: number;
    totalContracts: number;
  };
  byStatus: Record<ComplianceStatus, Array<{
    _id: string;
    contractId: string;
    contractTitle: string;
    variableName: string;
    expectedValue: any;
    actualValue: any;
    status: ComplianceStatus;
    alertLevel: AlertLevel;
    checkedAt: string;
    deviation?: {
      type: string;
      amount?: number;
      percentage?: number;
      description?: string;
    };
  }>>;
  byAlertLevel: Record<AlertLevel, number>;
  trackedVariables: Array<{
    _id: string;
    contractId: string;
    contractTitle: string;
    variableName: string;
    variableType: string;
    value: any;
  }>;
}

export default function ComplianceReportPage() {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ComplianceStatus | 'all'>('all');
  const [selectedAlertLevel, setSelectedAlertLevel] = useState<AlertLevel | 'all'>('all');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/compliance');
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

  const getStatusColor = (status: ComplianceStatus) => {
    const colors = {
      compliant: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800',
      non_compliant: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
    };
    return colors[status];
  };

  const getStatusLabel = (status: ComplianceStatus) => {
    const labels = {
      compliant: 'Uyumlu',
      non_compliant: 'Uyumsuz',
      warning: 'Uyarı',
      pending: 'Beklemede',
    };
    return labels[status];
  };

  const getAlertLevelColor = (level: AlertLevel) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return colors[level];
  };

  const getAlertLevelLabel = (level: AlertLevel) => {
    const labels = {
      low: 'Düşük',
      medium: 'Orta',
      high: 'Yüksek',
      critical: 'Kritik',
    };
    return labels[level];
  };

  const filteredChecks = () => {
    if (!report) return [];
    
    let checks = [];
    if (selectedStatus === 'all') {
      checks = [
        ...report.byStatus.compliant,
        ...report.byStatus.non_compliant,
        ...report.byStatus.warning,
        ...report.byStatus.pending,
      ];
    } else {
      checks = report.byStatus[selectedStatus];
    }

    if (selectedAlertLevel !== 'all') {
      checks = checks.filter((c) => c.alertLevel === selectedAlertLevel);
    }

    return checks;
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
                Uyumluluk Raporu
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Compliance takibi yapılan değişkenler ve kontrol durumları
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Kontrol</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.summary.totalChecks}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-green-700 dark:text-green-400 mb-1">Uyumlu</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {report.summary.compliant}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-red-700 dark:text-red-400 mb-1">Uyumsuz</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                  {report.summary.nonCompliant}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">Uyarı</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                  {report.summary.warning}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-700 dark:text-gray-400 mb-1">Beklemede</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.summary.pending}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Takip Edilen</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                  {report.summary.totalTrackedVariables}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Level Summary */}
        <Card className="mb-8 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
          <CardHeader>
            <CardTitle>Uyarı Seviyelerine Göre Dağılım</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['low', 'medium', 'high', 'critical'] as AlertLevel[]).map((level) => (
                <div
                  key={level}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAlertLevel === level
                      ? 'ring-2 ring-primary'
                      : 'border-gray-200 dark:border-gray-700'
                  } ${getAlertLevelColor(level)}`}
                  onClick={() => setSelectedAlertLevel(selectedAlertLevel === level ? 'all' : level)}
                >
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">{getAlertLevelLabel(level)}</p>
                    <p className="text-2xl font-bold">{report.byAlertLevel[level]}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
              {(['compliant', 'non_compliant', 'warning', 'pending'] as ComplianceStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedStatus === status
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Compliance Checks List */}
        <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
          <CardHeader>
            <CardTitle>
              Compliance Kontrolleri ({filteredChecks().length})
              {selectedStatus !== 'all' && (
                <Badge className={`ml-2 ${getStatusColor(selectedStatus)}`}>
                  {getStatusLabel(selectedStatus)}
                </Badge>
              )}
              {selectedAlertLevel !== 'all' && (
                <Badge className={`ml-2 ${getAlertLevelColor(selectedAlertLevel)}`}>
                  {getAlertLevelLabel(selectedAlertLevel)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredChecks().length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Bu kriterlere uygun compliance kontrolü bulunamadı
                </p>
              ) : (
                filteredChecks().map((check) => (
                  <Link
                    key={check._id}
                    href={`/dashboard/contracts/${check.contractId}`}
                    className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {check.contractTitle}
                          </h3>
                          <Badge className={getStatusColor(check.status)}>
                            {getStatusLabel(check.status)}
                          </Badge>
                          <Badge className={getAlertLevelColor(check.alertLevel)}>
                            {getAlertLevelLabel(check.alertLevel)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Değişken: <span className="font-medium">{check.variableName}</span>
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Beklenen: </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {typeof check.expectedValue === 'number'
                                ? check.expectedValue.toLocaleString('tr-TR')
                                : String(check.expectedValue)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Gerçek: </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {typeof check.actualValue === 'number'
                                ? check.actualValue.toLocaleString('tr-TR')
                                : String(check.actualValue)}
                            </span>
                          </div>
                          {check.deviation && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Sapma: </span>
                              <span className="font-medium text-red-600 dark:text-red-400">
                                {check.deviation.percentage
                                  ? `%${check.deviation.percentage.toFixed(2)}`
                                  : check.deviation.amount
                                  ? check.deviation.amount.toLocaleString('tr-TR')
                                  : '-'}
                              </span>
                            </div>
                          )}
                        </div>
                        {check.deviation?.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {check.deviation.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Kontrol Tarihi:{' '}
                          {new Date(check.checkedAt).toLocaleDateString('tr-TR', {
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

        {/* Tracked Variables */}
        {report.trackedVariables.length > 0 && (
          <Card className="mt-8 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle>Compliance Takibi Yapılan Değişkenler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.trackedVariables.map((variable) => (
                  <Link
                    key={variable._id}
                    href={`/dashboard/contracts/${variable.contractId}`}
                    className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {variable.contractTitle}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {variable.variableName} ({variable.variableType})
                        </p>
                      </div>
                      <Badge variant="outline">Takip Ediliyor</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


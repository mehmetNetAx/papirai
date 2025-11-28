'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface FinancialReport {
  totalByCurrency: Array<{
    currency: string;
    total: number;
    count: number;
  }>;
  contracts: Array<{
    _id: string;
    title: string;
    contractValue: number;
    currency: string;
    status: string;
    counterparty?: string;
  }>;
  summary: {
    totalContracts: number;
    totalValue: number;
    averageValue: number;
    currencies: string[];
  };
}

export default function FinancialReportPage() {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/financial');
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

  const filteredContracts = () => {
    if (!report) return [];
    if (selectedCurrency === 'all') return report.contracts;
    return report.contracts.filter((c) => c.currency === selectedCurrency);
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
                Finansal Rapor
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sözleşme değerleri, para birimleri ve toplam tutarlar
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Sözleşme Sayısı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {report.summary.totalContracts}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Değer (Tüm Para Birimleri)
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
                {formatCurrency(
                  report.summary.averageValue,
                  report.summary.currencies[0] || 'USD'
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Currency Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Para Birimi:</span>
            <button
              onClick={() => setSelectedCurrency('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCurrency === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Tümü
            </button>
            {report.summary.currencies.map((currency) => (
              <button
                key={currency}
                onClick={() => setSelectedCurrency(currency)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCurrency === currency
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {currency}
              </button>
            ))}
          </div>
        </div>

        {/* Total by Currency */}
        <Card className="mb-8 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
          <CardHeader>
            <CardTitle>Para Birimine Göre Toplamlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {report.totalByCurrency.map((item) => (
                <div
                  key={item.currency}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.currency}</span>
                    <Badge variant="outline">{item.count} sözleşme</Badge>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(item.total, item.currency)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contracts List */}
        <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
          <CardHeader>
            <CardTitle>
              Sözleşmeler ({filteredContracts().length})
              {selectedCurrency !== 'all' && ` - ${selectedCurrency}`}
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
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                          {contract.title}
                        </h3>
                        {contract.counterparty && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Karşı Taraf: {contract.counterparty}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(contract.contractValue, contract.currency)}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {contract.currency}
                        </Badge>
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


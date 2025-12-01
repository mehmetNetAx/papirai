'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import HelpButton from '@/components/help/HelpButton';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DocumentStats {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  byType: Array<{
    type: string;
    count: number;
    valid: number;
    expiringSoon: number;
    expired: number;
  }>;
  byCompany: Array<{
    companyId: string;
    companyName: string;
    count: number;
    valid: number;
    expiringSoon: number;
    expired: number;
  }>;
  expiringIn30Days: Array<{
    _id: string;
    originalFileName: string;
    companyName: string;
    validityEndDate: string;
    daysUntilExpiry: number;
  }>;
  expiredDocuments: Array<{
    _id: string;
    originalFileName: string;
    companyName: string;
    validityEndDate: string;
    daysSinceExpiry: number;
  }>;
}

const documentTypeLabels: Record<string, string> = {
  ek_protokol: 'Ek Protokol',
  ek: 'Ek',
  imza_sirkusu: 'İmza Sirküleri',
  vergi_levhasi: 'Vergi Levhası',
  ticaret_sicil_gazetesi: 'Ticaret Sicil Gazetesi',
  yetki_belgesi: 'Yetki Belgesi',
  diger: 'Diğer',
};

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function DocumentsReportPage() {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reports/documents');
      if (!response.ok) {
        throw new Error('Rapor yüklenirken bir hata oluştu');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading document stats:', err);
      setError(err.message || 'Rapor yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Prepare chart data
  const statusChartData = [
    { name: 'Geçerli', value: stats.valid, color: COLORS[0] },
    { name: 'Yakında Geçecek', value: stats.expiringSoon, color: COLORS[1] },
    { name: 'Süresi Dolmuş', value: stats.expired, color: COLORS[2] },
  ];

  const typeChartData = stats.byType.map((item) => ({
    name: documentTypeLabels[item.type] || item.type,
    Geçerli: item.valid,
    'Yakında Geçecek': item.expiringSoon,
    'Süresi Dolmuş': item.expired,
  }));

  const companyChartData = stats.byCompany.map((item) => ({
    name: item.companyName,
    Geçerli: item.valid,
    'Yakında Geçecek': item.expiringSoon,
    'Süresi Dolmuş': item.expired,
  }));

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">
                Doküman Raporu
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
                Doküman geçerlilik durumları ve istatistikleri
              </p>
            </div>
            <HelpButton module="reports" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Doküman</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-gray-400">description</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-green-200/80 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">Geçerli</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.valid}</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-green-400">check_circle</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-yellow-200/80 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">Yakında Geçecek</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.expiringSoon}</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-yellow-400">schedule</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-red-200/80 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">Süresi Dolmuş</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.expired}</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-red-400">warning</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution Pie Chart */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Geçerlilik Durumu Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Type Distribution Bar Chart */}
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Doküman Tipine Göre Dağılım</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Geçerli" fill={COLORS[0]} />
                  <Bar dataKey="Yakında Geçecek" fill={COLORS[1]} />
                  <Bar dataKey="Süresi Dolmuş" fill={COLORS[2]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Company Distribution Chart */}
        {stats.byCompany.length > 0 && (
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl mb-8">
            <CardHeader>
              <CardTitle>Şirkete Göre Dağılım</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={companyChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Geçerli" fill={COLORS[0]} />
                  <Bar dataKey="Yakında Geçecek" fill={COLORS[1]} />
                  <Bar dataKey="Süresi Dolmuş" fill={COLORS[2]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Expiring Soon Documents */}
        {stats.expiringIn30Days.length > 0 && (
          <Card className="border border-yellow-200/80 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20 shadow-sm rounded-xl mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">schedule</span>
                30 Gün İçinde Geçerliliği Sona Erecek Dokümanlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.expiringIn30Days.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-white dark:bg-[#192633]"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{doc.originalFileName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {doc.companyName} • {format(new Date(doc.validityEndDate), 'dd MMM yyyy', { locale: tr })}
                      </p>
                    </div>
                    <Badge className="bg-yellow-500 hover:bg-yellow-600">
                      {doc.daysUntilExpiry} gün kaldı
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expired Documents */}
        {stats.expiredDocuments.length > 0 && (
          <Card className="border border-red-200/80 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                Süresi Dolmuş Dokümanlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.expiredDocuments.slice(0, 20).map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-[#192633]"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{doc.originalFileName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {doc.companyName} • {format(new Date(doc.validityEndDate), 'dd MMM yyyy', { locale: tr })}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {doc.daysSinceExpiry} gün önce doldu
                    </Badge>
                  </div>
                ))}
                {stats.expiredDocuments.length > 20 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center pt-2">
                    ... ve {stats.expiredDocuments.length - 20} doküman daha
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Archive,
  Filter,
} from 'lucide-react';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bgColor: string;
}

const reportTypes: ReportType[] = [
  {
    id: 'master-variables',
    title: 'Master Değişken Raporları',
    description: 'Bitiş tarihi, fesih tarihi ve yenileme tarihlerine göre sözleşme durumları',
    icon: <FileText className="w-8 h-8" />,
    href: '/dashboard/reports/master-variables',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  },
  {
    id: 'status',
    title: 'Durum Raporu',
    description: 'Sözleşmelerin durumlarına göre (Taslak, Onay Bekliyor, Yürürlükte, vb.) dağılım',
    icon: <BarChart3 className="w-8 h-8" />,
    href: '/dashboard/reports/status',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  },
  {
    id: 'financial',
    title: 'Finansal Rapor',
    description: 'Sözleşme değerleri, para birimleri ve toplam tutarlar',
    icon: <DollarSign className="w-8 h-8" />,
    href: '/dashboard/reports/financial',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  },
  {
    id: 'timeline',
    title: 'Tarih Bazlı Rapor',
    description: 'Bitiş tarihlerine göre sözleşmeler (Geçmiş, 1 hafta, 1 ay, normal)',
    icon: <Calendar className="w-8 h-8" />,
    href: '/dashboard/reports/timeline',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  },
  {
    id: 'compliance',
    title: 'Uyumluluk Raporu',
    description: 'Compliance takibi yapılan değişkenler ve kontrol durumları',
    icon: <CheckCircle2 className="w-8 h-8" />,
    href: '/dashboard/reports/compliance',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'summary',
    title: 'Genel Özet Raporu',
    description: 'Tüm sözleşmelerin genel durumu, istatistikler ve özet bilgiler',
    icon: <TrendingUp className="w-8 h-8" />,
    href: '/dashboard/reports/summary',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  },
  {
    id: 'alerts',
    title: 'Uyarı ve Bildirimler',
    description: 'Dikkat gerektiren sözleşmeler, yaklaşan son tarihler ve kritik durumlar',
    icon: <AlertTriangle className="w-8 h-8" />,
    href: '/dashboard/reports/alerts',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  },
  {
    id: 'archived',
    title: 'Arşiv Raporu',
    description: 'Arşive kaldırılmış sözleşmeler ve arşiv istatistikleri',
    icon: <Archive className="w-8 h-8" />,
    href: '/dashboard/reports/archived',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
  },
];

interface QuickStats {
  totalContracts: number;
  activeContracts: number;
  upcomingDeadlines: number;
  archived: number;
}

export default function ReportsPage() {
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadQuickStats();
  }, []);

  const loadQuickStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/reports/quick-stats');
      if (!response.ok) throw new Error('Failed to load stats');
      const data = await response.json();
      setQuickStats(data);
    } catch (error: any) {
      console.error('Error loading quick stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">
            Raporlar
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
            Farklı kriterlere göre detaylı raporlar oluşturun ve analiz edin
          </p>
        </div>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((report) => (
            <Link key={report.id} href={report.href}>
              <Card
                className={`${report.bgColor} border-2 hover:shadow-lg transition-all duration-200 cursor-pointer group h-full`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`${report.color} p-3 rounded-lg bg-white dark:bg-gray-800 group-hover:scale-110 transition-transform`}>
                      {report.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors"
                  >
                    Raporu Görüntüle
                    <span className="material-symbols-outlined text-base ml-2">arrow_forward</span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Hızlı İstatistikler</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Sözleşme</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {loadingStats ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        quickStats?.totalContracts ?? 0
                      )}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Aktif Sözleşmeler</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {loadingStats ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        quickStats?.activeContracts ?? 0
                      )}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Yaklaşan Son Tarihler</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {loadingStats ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        quickStats?.upcomingDeadlines ?? 0
                      )}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Arşivlenmiş</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {loadingStats ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        quickStats?.archived ?? 0
                      )}
                    </p>
                  </div>
                  <Archive className="w-8 h-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ActivityLog {
  _id: string;
  activityType: string;
  level: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  resourceTitle?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  errorMessage?: string;
  details?: Record<string, any>;
}

interface UserActivityLogsClientProps {
  userId: string;
  currentUserId: string;
  currentUserRole: string;
}

export default function UserActivityLogsClient({ userId, currentUserId, currentUserRole }: UserActivityLogsClientProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  
  const [filters, setFilters] = useState({
    activityType: 'all',
    level: 'all',
    startDate: '',
    endDate: '',
    action: '',
  });

  useEffect(() => {
    loadLogs();
  }, [page, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        skip: ((page - 1) * limit).toString(),
      });

      if (filters.activityType && filters.activityType !== 'all') params.append('activityType', filters.activityType);
      if (filters.level && filters.level !== 'all') params.append('level', filters.level);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.action) params.append('action', filters.action);

      const response = await fetch(`/api/logging/users/${userId}?${params}`);
      if (!response.ok) throw new Error('Failed to load logs');
      
      const data = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error loading logs:', error);
      alert('Loglar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'debug':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kullanıcı Aktivite Logları</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Toplam {total} log kaydı
            </p>
          </div>
          <Link href="/dashboard/users">
            <Button variant="ghost">Geri</Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtreler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Aktivite Tipi</Label>
                <Select
                  value={filters.activityType}
                  onValueChange={(value) => setFilters({ ...filters, activityType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="login">Giriş</SelectItem>
                    <SelectItem value="logout">Çıkış</SelectItem>
                    <SelectItem value="page_view">Sayfa Görüntüleme</SelectItem>
                    <SelectItem value="navigation">Navigasyon</SelectItem>
                    <SelectItem value="api_call">API Çağrısı</SelectItem>
                    <SelectItem value="error">Hata</SelectItem>
                    <SelectItem value="warning">Uyarı</SelectItem>
                    <SelectItem value="data_access">Veri Erişimi</SelectItem>
                    <SelectItem value="data_modification">Veri Değişikliği</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Log Seviyesi</Label>
                <Select
                  value={filters.level}
                  onValueChange={(value) => setFilters({ ...filters, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="error">Hata</SelectItem>
                    <SelectItem value="warning">Uyarı</SelectItem>
                    <SelectItem value="info">Bilgi</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Aksiyon (Ara)</Label>
                <Input
                  placeholder="Aksiyon adı..."
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                />
              </div>

              <div>
                <Label>Başlangıç Tarihi</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div>
                <Label>Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={() => setFilters({
                  activityType: 'all',
                  level: 'all',
                  startDate: '',
                  endDate: '',
                  action: '',
                })} variant="outline" className="w-full">
                  Filtreleri Temizle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Log Kayıtları</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Log kaydı bulunamadı.</p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-2 text-sm font-medium">Tarih</th>
                        <th className="text-left p-2 text-sm font-medium">Tip</th>
                        <th className="text-left p-2 text-sm font-medium">Seviye</th>
                        <th className="text-left p-2 text-sm font-medium">Aksiyon</th>
                        <th className="text-left p-2 text-sm font-medium">URL</th>
                        <th className="text-left p-2 text-sm font-medium">Durum</th>
                        <th className="text-left p-2 text-sm font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-2 text-sm">{formatDate(log.timestamp)}</td>
                          <td className="p-2 text-sm">{log.activityType}</td>
                          <td className="p-2">
                            <Badge className={getLevelColor(log.level)}>
                              {log.level}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm">{log.action}</td>
                          <td className="p-2 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {log.url}
                          </td>
                          <td className="p-2 text-sm">
                            {log.statusCode && (
                              <Badge className={log.statusCode >= 400 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                {log.statusCode}
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 text-sm text-gray-600 dark:text-gray-400">
                            {log.ipAddress}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sayfa {page} / {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Önceki
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Sonraki
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



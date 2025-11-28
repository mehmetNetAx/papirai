import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getNotifications, getUnreadNotificationCount } from '@/lib/services/notification';

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    page?: string;
  }>;
}

function getNotificationTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    contract_assigned: 'Sözleşme Atandı',
    contract_updated: 'Sözleşme Güncellendi',
    contract_alert: 'Sözleşme Uyarısı',
    contract_expiring: 'Sözleşme Süresi Yaklaşıyor',
    contract_expired: 'Sözleşme Süresi Doldu',
    deadline_approaching: 'Son Tarih Yaklaşıyor',
    deadline_missed: 'Son Tarih Geçti',
    compliance_alert: 'Uyumluluk Uyarısı',
    approval_request: 'Onay İsteği',
    approval_decision: 'Onay Kararı',
    signature_request: 'İmza İsteği',
    signature_completed: 'İmza Tamamlandı',
    system: 'Sistem',
  };
  return labelMap[type] || type;
}

function getNotificationIcon(type: string): string {
  const iconMap: Record<string, string> = {
    contract_assigned: 'person_add',
    contract_updated: 'edit',
    contract_alert: 'warning',
    deadline_approaching: 'schedule',
    deadline_missed: 'error',
    contract_expiring: 'event',
    contract_expired: 'event_busy',
    compliance_alert: 'gavel',
    approval_request: 'check_circle',
    approval_decision: 'done',
    signature_request: 'draw',
    signature_completed: 'check',
    system: 'info',
  };
  return iconMap[type] || 'notifications';
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  await connectDB();

  const params = await searchParams;
  const filter = params.filter || 'all';
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  // Get notifications based on filter
  let notifications: any[] = [];
  let totalCount = 0;

  if (filter === 'unread') {
    notifications = await getNotifications(session.user.id, true);
    totalCount = notifications.length;
    notifications = notifications.slice(skip, skip + limit);
  } else if (filter === 'read') {
    const allNotifications = await getNotifications(session.user.id, false);
    notifications = allNotifications.filter((n: any) => n.read);
    totalCount = notifications.length;
    notifications = notifications.slice(skip, skip + limit);
  } else {
    const allNotifications = await getNotifications(session.user.id, false);
    notifications = allNotifications.slice(skip, skip + limit);
    totalCount = allNotifications.length;
  }

  const unreadCount = await getUnreadNotificationCount(session.user.id);
  const totalPages = Math.ceil(totalCount / limit);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Bildirimler
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {unreadCount > 0 && (
                <span className="font-medium text-primary">{unreadCount} okunmamış bildirim</span>
              )}
              {unreadCount === 0 && 'Tüm bildirimler okundu'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <span className="material-symbols-outlined text-lg mr-2">arrow_back</span>
                Geri
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/dashboard/notifications?filter=all"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Tümü ({totalCount})
          </Link>
          <Link
            href="/dashboard/notifications?filter=unread"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Okunmamış ({unreadCount})
          </Link>
          <Link
            href="/dashboard/notifications?filter=read"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'read'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Okunmuş
          </Link>
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Bildirimler</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">notifications_off</span>
                <p className="text-lg">Bildirim bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification: any) => (
                  <Link
                    key={notification._id.toString()}
                    href={
                      notification.relatedResourceType === 'contract' && notification.relatedResourceId
                        ? `/dashboard/contracts/${notification.relatedResourceId.toString()}`
                        : '#'
                    }
                    className={`block p-4 rounded-lg border transition-colors ${
                      notification.read
                        ? 'bg-white dark:bg-[#192633] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1f2e3d]'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-2xl text-primary mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                          {!notification.read && (
                            <Badge className="bg-primary text-white text-xs">Yeni</Badge>
                          )}
                        </div>
                        <p className={`text-sm ${notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Sayfa {page} / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link href={`/dashboard/notifications?filter=${filter}&page=${page - 1}`}>
                      <Button variant="outline" size="sm">Önceki</Button>
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/dashboard/notifications?filter=${filter}&page=${page + 1}`}>
                      <Button variant="outline" size="sm">Sonraki</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


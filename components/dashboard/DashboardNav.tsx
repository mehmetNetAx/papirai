'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardNavProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/contracts', label: 'Sözleşmeler', icon: '📄' },
  { href: '/dashboard/documents', label: 'Dokümanlar', icon: '📑' },
  { href: '/dashboard/organizations', label: 'Organizasyonlar', icon: '🏢' },
  { href: '/dashboard/workspaces', label: 'Çalışma Alanları', icon: '📁' },
  { href: '/dashboard/compliance', label: 'Uyum', icon: '✅' },
  { href: '/dashboard/reports', label: 'Raporlar', icon: '📈' },
];

const adminNavItems = [
  { href: '/dashboard/companies', label: 'Şirketler', icon: '🏢' },
  { href: '/dashboard/users', label: 'Kullanıcılar', icon: '👥' },
  { href: '/dashboard/integrations', label: 'Entegrasyonlar', icon: '🔌' },
];

const systemAdminNavItems = [
  { href: '/dashboard/settings/mail', label: 'Mail Ayarları', icon: '📧' },
  { href: '/dashboard/settings/logging', label: 'Loglama Ayarları', icon: '📝' },
];

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const isAdmin = ['system_admin', 'group_admin', 'company_admin'].includes(user.role);
  const isSystemAdmin = user.role === 'system_admin';

  return (
    <nav className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111a22] p-4">
      <div className="mb-6">
        <p className="text-sm text-gray-900 dark:text-white font-medium mb-1 font-display">{user.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {user.role === 'system_admin' && 'Sistem Yöneticisi'}
          {user.role === 'group_admin' && 'Grup Yöneticisi'}
          {user.role === 'company_admin' && 'Şirket Yöneticisi'}
          {user.role === 'contract_manager' && 'Sözleşme Yöneticisi'}
          {user.role === 'legal_reviewer' && 'Hukuk İnceleyici'}
          {user.role === 'viewer' && 'Görüntüleyici'}
          {!['system_admin', 'group_admin', 'company_admin', 'contract_manager', 'legal_reviewer', 'viewer'].includes(user.role) && user.role.replace('_', ' ')}
        </p>
      </div>

      <div className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-semibold font-display'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-primary'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="my-2 border-t border-gray-200 dark:border-gray-800"></div>
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-semibold font-display'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-primary'
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}

        {isSystemAdmin && (
          <>
            <div className="my-2 border-t border-gray-200 dark:border-gray-800"></div>
            {systemAdminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-semibold font-display'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-primary'
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </div>

      <div className="mt-auto border-t pt-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Çıkış Yap
        </Button>
      </div>
    </nav>
  );
}


'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import Logo from '@/components/brand/Logo';
import ContextSelector from './ContextSelector';
import NotificationDropdown from './NotificationDropdown';

interface DashboardHeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/contracts', label: 'Sözleşmeler' },
    { href: '/dashboard/documents', label: 'Dokümanlar' },
    { href: '/dashboard/chat', label: 'AI Chat' },
    { href: '/dashboard/organizations', label: 'Organizasyonlar' },
    { href: '/dashboard/reports', label: 'Raporlar' },
  ];

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-gray-800 px-6 lg:px-10 py-3 bg-white dark:bg-[#111a22]">
      <Logo href="/dashboard" size="md" />

      <div className="flex items-center gap-9">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium leading-normal transition-colors ${
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'text-primary dark:text-primary font-bold font-display'
                : 'text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <ContextSelector />
      </div>

      <div className="flex items-center gap-4">
        {pathname.includes('/organizations') && (
          <Link href="/dashboard/companies/new">
            <Button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]">
              <span className="truncate">Yeni Grup Şirketi Ekle</span>
            </Button>
          </Link>
        )}
        <NotificationDropdown />
        {user && (
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-primary/10 flex items-center justify-center"
            title={user.name || user.email || ''}
          >
            <span className="text-primary font-bold">
              {(user.name || user.email || 'U')[0].toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}


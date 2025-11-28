'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Workspace {
  _id: string;
  name: string;
  companyId?: string;
}

interface Subsidiary {
  _id: string;
  name: string;
  description?: string;
  type?: string;
  isActive?: boolean;
  parentCompanyId?: string;
  createdAt?: string;
  updatedAt?: string;
  workspaces?: Workspace[];
}

interface CompanyCardProps {
  company: {
    _id: string;
    name: string;
    description?: string;
    type: 'group' | 'subsidiary';
    workspaces?: Workspace[];
    subsidiaries?: Subsidiary[];
  };
  userRole: string;
  isGroup?: boolean;
}

export default function CompanyCard({ company, userRole, isGroup = false }: CompanyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const hasWorkspaces = company.workspaces && company.workspaces.length > 0;
  const hasSubsidiaries = company.subsidiaries && company.subsidiaries.length > 0;
  const canExpand = hasWorkspaces || hasSubsidiaries;

  return (
    <div className="space-y-4">
      <Card
        className={`${
          isGroup
            ? 'border-2 border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-lg'
            : 'hover:shadow-lg border-l-4 border-l-primary dark:border-l-primary'
        } transition-shadow ${canExpand ? 'cursor-pointer' : ''}`}
        onClick={canExpand ? toggleExpand : undefined}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              {canExpand && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand();
                  }}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span
                    className={`material-symbols-outlined text-lg transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  >
                    chevron_right
                  </span>
                </button>
              )}
              <div className={`p-2 rounded-lg ${isGroup ? 'bg-primary/10 dark:bg-primary/20' : ''}`}>
                <span
                  className={`material-symbols-outlined ${
                    isGroup ? 'text-primary text-2xl' : 'text-primary dark:text-primary text-xl'
                  }`}
                >
                  {isGroup ? 'apartment' : 'business_center'}
                </span>
              </div>
              <div className="flex-1">
                <CardTitle className={`${isGroup ? 'text-xl' : 'text-lg'}`}>{company.name}</CardTitle>
                {isGroup && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Grup Şirketi</p>
                )}
              </div>
            </div>
            <Badge
              variant={isGroup ? 'default' : 'secondary'}
              className={isGroup ? 'bg-primary text-white' : ''}
            >
              {isGroup ? 'Grup' : 'Yan Kuruluş'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {company.description}
            </p>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              {hasSubsidiaries && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">business_center</span>
                  {company.subsidiaries?.length || 0} Yan Kuruluş
                </span>
              )}
              {hasWorkspaces && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">folder</span>
                  {company.workspaces?.length || 0} Çalışma Alanı
                </span>
              )}
            </div>
            {['system_admin', 'group_admin', 'company_admin'].includes(userRole) && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                asChild
              >
                <Link href={`/dashboard/companies/${company._id}`}>Detaylar</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expanded Content */}
      {isExpanded && canExpand && (
        <div className="ml-8 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Subsidiaries */}
          {hasSubsidiaries && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
                <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  Yan Kuruluşlar
                </div>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
              </div>
              <div className="flex flex-wrap gap-4">
                {company.subsidiaries?.map((sub: Subsidiary) => (
                  <div
                    key={sub._id}
                    className="min-w-0 flex-1"
                    style={{ minWidth: '280px', maxWidth: '100%' }}
                  >
                    <CompanyCard
                      company={{
                        ...sub,
                        type: (sub.type as 'group' | 'subsidiary') || 'subsidiary',
                      }}
                      userRole={userRole}
                      isGroup={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workspaces */}
          {hasWorkspaces && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
                <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  Çalışma Alanları
                </div>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
              </div>
              <div className="flex flex-wrap gap-3">
                {company.workspaces?.map((ws: Workspace) => (
                  <Link
                    key={ws._id}
                    href={`/dashboard/workspaces/${ws._id}`}
                    className="block min-w-0 flex-1"
                    style={{ minWidth: '200px', maxWidth: '100%' }}
                  >
                    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500 dark:border-l-green-400 h-full">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-green-500 dark:text-green-400 shrink-0">
                            folder
                          </span>
                          <span className="font-medium text-sm truncate" title={ws.name}>
                            {ws.name}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


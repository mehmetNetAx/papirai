'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Link from 'next/link';
import { checkDateStatus, DateStatus } from '@/lib/utils/date-status';
import ArchiveContractButton from '@/components/contracts/ArchiveContractButton';

interface Contract {
  _id: string;
  title: string;
  status: string;
  startDate: string | Date;
  endDate: string | Date;
  workspaceId?: { name: string } | string;
  counterparty?: string;
  companyId?: { name: string } | string;
  counterpartyId?: { name: string } | string;
  updatedAt: string | Date;
  isActive?: boolean;
}

type DateFilter = 'all' | 'passed' | 'critical' | 'warning' | 'normal';
type StatusFilter = 'all' | 'draft' | 'in_review' | 'pending_approval' | 'approved' | 'pending_signature' | 'executed' | 'expired' | 'terminated';
type ActiveFilter = 'all' | 'active' | 'archived';

export default function ContractsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    (searchParams.get('dateFilter') as DateFilter) || 'all'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get('statusFilter') as StatusFilter) || 'all'
  );
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(
    (searchParams.get('activeFilter') as ActiveFilter) || 'all'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [counterpartyFilter, setCounterpartyFilter] = useState(searchParams.get('counterparty') || '');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Load contracts on initial mount only
  useEffect(() => {
    loadContracts();
  }, []); // Only on mount

  const loadContracts = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (activeFilter === 'active') params.set('isActive', 'true');
      else if (activeFilter === 'archived') params.set('isActive', 'false');
      // 'all' means don't set isActive parameter (show all)
      if (searchQuery) params.set('search', searchQuery);
      if (counterpartyFilter) params.set('counterparty', counterpartyFilter);
      
      const response = await fetch(`/api/contracts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load contracts');
      const data = await response.json();
      console.log('[Contracts Page] Loaded contracts:', data.contracts?.length || 0);
      setContracts(data.contracts || []);
    } catch (error: any) {
      console.error('Error loading contracts:', error);
      alert('Sözleşmeler yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    // Update URL with current filter values
    const params = new URLSearchParams();
    if (dateFilter !== 'all') params.set('dateFilter', dateFilter);
    if (statusFilter !== 'all') params.set('statusFilter', statusFilter);
    if (activeFilter !== 'active') params.set('activeFilter', activeFilter);
    if (searchQuery) params.set('search', searchQuery);
    if (counterpartyFilter) params.set('counterparty', counterpartyFilter);
    router.replace(`/dashboard/contracts?${params.toString()}`);
    
    // Load contracts with filters
    loadContracts();
  };

  const getEndDateStatus = (endDate: string | Date | null | undefined): DateStatus | null => {
    if (!endDate) return null;
    const status = checkDateStatus(endDate, 'Bitiş Tarihi', 30, 7);
    return status?.status || null;
  };

  const getDateStatusInfo = (endDate: string | Date | null | undefined) => {
    if (!endDate) return null;
    return checkDateStatus(endDate, 'Bitiş Tarihi', 30, 7);
  };

  const getStatusIcon = (status: DateStatus | null) => {
    switch (status) {
      case 'passed':
        return '⚠️'; // Red warning
      case 'critical':
        return '🔴'; // Red circle
      case 'warning':
        return '🟡'; // Yellow circle
      case 'normal':
        return '🟢'; // Green circle
      default:
        return '⚪'; // White circle
    }
  };

  const getStatusColor = (status: DateStatus | null) => {
    switch (status) {
      case 'passed':
        return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20';
      case 'critical':
        return 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20';
      case 'warning':
        return 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20';
      case 'normal':
        return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusTextColor = (status: DateStatus | null) => {
    switch (status) {
      case 'passed':
        return 'text-red-700 dark:text-red-400';
      case 'critical':
        return 'text-orange-700 dark:text-orange-400';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'normal':
        return 'text-green-700 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: DateStatus | null) => {
    switch (status) {
      case 'passed':
        return 'Tarihi Geçti';
      case 'critical':
        return '1 Hafta İçinde';
      case 'warning':
        return '1 Ay İçinde';
      case 'normal':
        return 'Normal';
      default:
        return 'Tarih Yok';
    }
  };


  const filteredContracts = contracts.filter((contract) => {
    if (dateFilter === 'all') {
      // Show all contracts when "all" is selected - no filtering
      return true;
    }
    // For other filters, only show contracts with endDate
    if (!contract.endDate) return false;
    const status = getEndDateStatus(contract.endDate);
    return status === dateFilter;
  });

  // Debug logging
  useEffect(() => {
    console.log('[Contracts Page] Filter:', dateFilter);
    console.log('[Contracts Page] Total contracts:', contracts.length);
    console.log('[Contracts Page] Filtered contracts:', filteredContracts.length);
    console.log('[Contracts Page] Contracts with endDate:', contracts.filter(c => c.endDate).length);
  }, [dateFilter, contracts.length, filteredContracts.length]);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    pending_signature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    executed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  const getStatusLabelText = (status: string): string => {
    const statusMap: Record<string, string> = {
      draft: 'Taslak',
      in_review: 'İncelemede',
      pending_approval: 'Onay Bekliyor',
      approved: 'Onaylandı',
      pending_signature: 'İmza Bekliyor',
      executed: 'Yürürlükte',
      expired: 'Süresi Doldu',
      terminated: 'Feshedildi',
    };
    return statusMap[status] || status;
  };

  const filterCounts = {
    all: contracts.length,
    passed: contracts.filter((c) => getEndDateStatus(c.endDate) === 'passed').length,
    critical: contracts.filter((c) => getEndDateStatus(c.endDate) === 'critical').length,
    warning: contracts.filter((c) => getEndDateStatus(c.endDate) === 'warning').length,
    normal: contracts.filter((c) => getEndDateStatus(c.endDate) === 'normal').length,
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Sözleşmeler yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">
              Sözleşmeler
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
              Sözleşmelerinizi yönetin ve takip edin
            </p>
          </div>
          <Button asChild className="button button-egg-blue">
            <Link href="/dashboard/contracts/new">Yeni Sözleşme</Link>
          </Button>
        </div>

        {/* Advanced Filters */}
        <Accordion type="single" collapsible className="mb-6">
          <AccordionItem value="filters" className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="text-lg font-semibold">Filtreler</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-0">
            {/* Search and Counterparty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Ara (Başlık, İçerik, Tip)</Label>
                <Input
                  id="search"
                  placeholder="Sözleşme başlığı, içeriği veya tipinde ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counterparty">Karşı Taraf</Label>
                <Input
                  id="counterparty"
                  placeholder="Karşı taraf adı ile ara..."
                  value={counterpartyFilter}
                  onChange={(e) => setCounterpartyFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Status and Active Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="statusFilter">Durum</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger id="statusFilter">
                    <SelectValue placeholder="Durum seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="draft">Taslak</SelectItem>
                    <SelectItem value="in_review">İncelemede</SelectItem>
                    <SelectItem value="pending_approval">Onay Bekliyor</SelectItem>
                    <SelectItem value="approved">Onaylandı</SelectItem>
                    <SelectItem value="pending_signature">İmza Bekliyor</SelectItem>
                    <SelectItem value="executed">Yürürlükte</SelectItem>
                    <SelectItem value="expired">Süresi Doldu</SelectItem>
                    <SelectItem value="terminated">İptal Edildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activeFilter">Aktiflik Durumu</Label>
                <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as ActiveFilter)}>
                  <SelectTrigger id="activeFilter">
                    <SelectValue placeholder="Aktiflik durumu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif Sözleşmeler</SelectItem>
                    <SelectItem value="archived">Arşive Kaldırılanlar</SelectItem>
                    <SelectItem value="all">Tümü</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Filter Buttons */}
            <div className="space-y-2">
              <Label>Bitiş Tarihi Filtreleri</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={dateFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setDateFilter('all')}
                  size="sm"
                >
                  Tümü ({filterCounts.all})
                </Button>
                <Button
                  variant={dateFilter === 'passed' ? 'default' : 'outline'}
                  onClick={() => setDateFilter('passed')}
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                >
                  Geçmiş ({filterCounts.passed})
                </Button>
                <Button
                  variant={dateFilter === 'critical' ? 'default' : 'outline'}
                  onClick={() => setDateFilter('critical')}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                >
                  1 Hafta İçinde ({filterCounts.critical})
                </Button>
                <Button
                  variant={dateFilter === 'warning' ? 'default' : 'outline'}
                  onClick={() => setDateFilter('warning')}
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                >
                  1 Ay İçinde ({filterCounts.warning})
                </Button>
                <Button
                  variant={dateFilter === 'normal' ? 'default' : 'outline'}
                  onClick={() => setDateFilter('normal')}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white border-green-500"
                >
                  Normal ({filterCounts.normal})
                </Button>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              {(searchQuery || counterpartyFilter || statusFilter !== 'all' || activeFilter !== 'active' || dateFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setCounterpartyFilter('');
                    setStatusFilter('all');
                    setActiveFilter('active');
                    setDateFilter('all');
                    // Apply cleared filters
                    setTimeout(() => {
                      handleApplyFilters();
                    }, 100);
                  }}
                >
                  Filtreleri Temizle
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleApplyFilters}
                className="button button-egg-blue"
              >
                <span className="material-symbols-outlined text-base mr-2">filter_list</span>
                Filtrele
              </Button>
            </div>
              </CardContent>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {filteredContracts.length === 0 ? (
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="py-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {dateFilter === 'all'
                    ? 'Henüz sözleşme yok. Başlamak için ilk sözleşmenizi oluşturun.'
                    : 'Bu filtreye uygun sözleşme bulunamadı.'}
                </p>
                {dateFilter === 'all' && (
                  <Button asChild className="button button-egg-blue">
                    <Link href="/dashboard/contracts/new">Yeni Sözleşme Oluştur</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {filteredContracts.map((contract) => {
              const endDateStatus = getEndDateStatus(contract.endDate);
              const dateStatusInfo = getDateStatusInfo(contract.endDate);
              const workspaceName =
                typeof contract.workspaceId === 'object' && contract.workspaceId
                  ? contract.workspaceId.name
                  : contract.workspaceId || '';

              return (
                <Card
                  key={contract._id}
                  className={`group border ${
                    contract.isActive === false
                      ? 'border-gray-400/60 dark:border-gray-600/60 bg-gray-50/50 dark:bg-gray-900/30 opacity-75'
                      : endDateStatus
                      ? getStatusColor(endDateStatus)
                      : 'border-gray-200/80 dark:border-[#324d67]/50'
                  } bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative`}
                >
                  <div
                    className={`absolute top-0 left-0 w-1 h-full ${
                      endDateStatus === 'passed'
                        ? 'bg-red-500'
                        : endDateStatus === 'critical'
                        ? 'bg-orange-500'
                        : endDateStatus === 'warning'
                        ? 'bg-yellow-500'
                        : endDateStatus === 'normal'
                        ? 'bg-green-500'
                        : 'bg-primary'
                    } opacity-0 group-hover:opacity-100 transition-opacity`}
                  ></div>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {contract.isActive === false ? (
                                <span className="text-xl text-gray-500 dark:text-gray-500" title="Arşivlenmiş Sözleşme">
                                  <span className="material-symbols-outlined">archive</span>
                                </span>
                              ) : endDateStatus ? (
                                <span className="text-xl" title={getStatusLabel(endDateStatus)}>
                                  {getStatusIcon(endDateStatus)}
                                </span>
                              ) : null}
                              <Link
                                href={`/dashboard/contracts/${contract._id}`}
                                className={`text-lg font-semibold transition-colors font-display block ${
                                  contract.isActive === false
                                    ? 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    : 'text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary group-hover:text-primary dark:group-hover:text-primary'
                                }`}
                              >
                                {contract.title}
                              </Link>
                            </div>
                            {dateStatusInfo && (
                              <Badge
                                className={`${getStatusTextColor(endDateStatus)} bg-transparent border ${
                                  endDateStatus === 'passed'
                                    ? 'border-red-300 dark:border-red-700'
                                    : endDateStatus === 'critical'
                                    ? 'border-orange-300 dark:border-orange-700'
                                    : endDateStatus === 'warning'
                                    ? 'border-yellow-300 dark:border-yellow-700'
                                    : 'border-green-300 dark:border-green-700'
                                } text-xs mb-2`}
                              >
                                {dateStatusInfo.message}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {contract.isActive === false && (
                              <Badge variant="outline" className="text-xs border-gray-400 text-gray-600 dark:text-gray-400">
                                Arşiv
                              </Badge>
                            )}
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                statusColors[contract.status] || statusColors.draft
                              }`}
                            >
                              {getStatusLabelText(contract.status)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {workspaceName && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                />
                              </svg>
                              <span>{workspaceName}</span>
                            </div>
                          )}
                          {(contract.companyId || contract.counterpartyId || contract.counterparty) && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              <span>
                                {(() => {
                                  const companyName = typeof contract.companyId === 'object' && contract.companyId?.name 
                                    ? contract.companyId.name 
                                    : typeof contract.companyId === 'string' 
                                    ? contract.companyId 
                                    : null;
                                  const counterpartyName = typeof contract.counterpartyId === 'object' && contract.counterpartyId?.name 
                                    ? contract.counterpartyId.name 
                                    : typeof contract.counterpartyId === 'string' 
                                    ? contract.counterpartyId 
                                    : contract.counterparty || null;
                                  
                                  if (companyName && counterpartyName) {
                                    return `${companyName} ↔ ${counterpartyName}`;
                                  } else if (companyName) {
                                    return `Bizim Şirket: ${companyName}`;
                                  } else if (counterpartyName) {
                                    return `Karşı Taraf: ${counterpartyName}`;
                                  }
                                  return null;
                                })()}
                              </span>
                            </div>
                          )}
                          {contract.endDate && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <span>
                                Bitiş: {new Date(contract.endDate).toLocaleDateString('tr-TR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>
                              Güncellendi:{' '}
                              {new Date(contract.updatedAt).toLocaleDateString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/contracts/${contract._id}`} className="text-sm">
                            Görüntüle
                          </Link>
                        </Button>
                        <ArchiveContractButton
                          contractId={contract._id}
                          contractTitle={contract.title}
                          isActive={contract.isActive}
                          variant="outline"
                          size="sm"
                          onArchived={() => {
                            // Reload contracts after status change
                            loadContracts();
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

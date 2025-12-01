'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import HelpButton from '@/components/help/HelpButton';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Document {
  _id: string;
  companyId: {
    _id: string;
    name: string;
  };
  counterpartyCompanyId?: {
    _id: string;
    name: string;
  } | null;
  documentType: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  validityStartDate: string;
  validityEndDate: string;
  uploadedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  description?: string;
  tags?: string[];
  validityStatus: 'valid' | 'expiring_soon' | 'expired';
  createdAt: string;
}

type ValidityFilter = 'all' | 'valid' | 'expiring_soon' | 'expired';

const documentTypeLabels: Record<string, string> = {
  ek_protokol: 'Ek Protokol',
  ek: 'Ek',
  imza_sirkusu: 'İmza Sirküleri',
  vergi_levhasi: 'Vergi Levhası',
  ticaret_sicil_gazetesi: 'Ticaret Sicil Gazetesi',
  yetki_belgesi: 'Yetki Belgesi',
  diger: 'Diğer',
};

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [companyFilter, setCompanyFilter] = useState(searchParams.get('companyId') || 'all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState(searchParams.get('documentType') || 'all');
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>(
    (searchParams.get('validityStatus') as ValidityFilter) || 'all'
  );
  const [companies, setCompanies] = useState<Array<{ _id: string; name: string }>>([]);
  
  // Pagination
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [page, searchQuery, companyFilter, documentTypeFilter, validityFilter]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) throw new Error('Failed to load companies');
      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (err: any) {
      console.error('Error loading companies:', err);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (companyFilter && companyFilter !== 'all') params.set('companyId', companyFilter);
      if (documentTypeFilter && documentTypeFilter !== 'all') params.set('documentType', documentTypeFilter);
      if (validityFilter && validityFilter !== 'all') params.set('validityStatus', validityFilter);
      params.set('page', page.toString());
      params.set('limit', '20');

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Dokümanlar yüklenirken bir hata oluştu');
      }
      
      const data = await response.json();
      setDocuments(data.documents || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);

      // Update URL
      const newParams = new URLSearchParams(params);
      router.replace(`/dashboard/documents?${newParams.toString()}`, { scroll: false });
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Dokümanlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    setPage(1);
    loadDocuments();
  };

  const getValidityStatusBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return (
          <Badge variant="destructive" className="ml-2">
            Süresi Dolmuş
          </Badge>
        );
      case 'expiring_soon':
        return (
          <Badge className="ml-2 bg-yellow-500 hover:bg-yellow-600">
            Yakında Geçecek
          </Badge>
        );
      case 'valid':
        return (
          <Badge className="ml-2 bg-green-500 hover:bg-green-600">
            Geçerli
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getDocumentDownloadUrl = async (companyId: string, documentId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to get download URL');
      const data = await response.json();
      return data.document?.downloadUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  };

  const handleDownload = async (document: Document) => {
    const url = await getDocumentDownloadUrl(document.companyId._id, document._id);
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Count documents by validity status
  const expiredCount = documents.filter(d => d.validityStatus === 'expired').length;
  const expiringSoonCount = documents.filter(d => d.validityStatus === 'expiring_soon').length;
  const validCount = documents.filter(d => d.validityStatus === 'valid').length;

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">
                Doküman Yönetimi
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
                Tüm doküman arşivine erişin, arayın ve yönetin
              </p>
            </div>
            <HelpButton module="documents" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Doküman</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-gray-400">description</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-red-200/80 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">Süresi Dolmuş</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{expiredCount}</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-red-400">warning</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-yellow-200/80 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">Yakında Geçecek</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{expiringSoonCount}</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-yellow-400">schedule</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-green-200/80 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">Geçerli</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{validCount}</p>
                </div>
                <span className="material-symbols-outlined text-3xl text-green-400">check_circle</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Accordion type="single" collapsible className="mb-6">
          <AccordionItem value="filters" className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="text-lg font-semibold">Filtreler</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-0">
                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search">Ara (Dosya Adı, Açıklama)</Label>
                  <Input
                    id="search"
                    placeholder="Doküman adı veya açıklamasında ara..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFilterChange();
                      }
                    }}
                  />
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Company Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="company">Şirket</Label>
                    <Select
                      value={companyFilter}
                      onValueChange={(value) => {
                        setCompanyFilter(value);
                        setPage(1);
                        handleFilterChange();
                      }}
                    >
                      <SelectTrigger id="company">
                        <SelectValue placeholder="Tüm Şirketler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Şirketler</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company._id} value={company._id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Document Type Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Doküman Tipi</Label>
                    <Select
                      value={documentTypeFilter}
                      onValueChange={(value) => {
                        setDocumentTypeFilter(value);
                        setPage(1);
                        handleFilterChange();
                      }}
                    >
                      <SelectTrigger id="documentType">
                        <SelectValue placeholder="Tüm Tipler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Tipler</SelectItem>
                        {Object.entries(documentTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Validity Status Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="validityStatus">Geçerlilik Durumu</Label>
                    <Select
                      value={validityFilter}
                      onValueChange={(value: ValidityFilter) => {
                        setValidityFilter(value);
                        setPage(1);
                        handleFilterChange();
                      }}
                    >
                      <SelectTrigger id="validityStatus">
                        <SelectValue placeholder="Tüm Durumlar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Durumlar</SelectItem>
                        <SelectItem value="expired">Süresi Dolmuş</SelectItem>
                        <SelectItem value="expiring_soon">Yakında Geçecek</SelectItem>
                        <SelectItem value="valid">Geçerli</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setCompanyFilter('all');
                      setDocumentTypeFilter('all');
                      setValidityFilter('all');
                      setPage(1);
                      handleFilterChange();
                    }}
                  >
                    Filtreleri Temizle
                  </Button>
                </div>
              </CardContent>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Dokümanlar yükleniyor...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        {!loading && !error && documents.length === 0 && (
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">description</span>
              <p className="text-gray-600 dark:text-gray-400">Doküman bulunamadı</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && documents.length > 0 && (
          <>
            <div className="space-y-4 mb-6">
              {documents.map((document) => (
                <Card
                  key={document._id}
                  className={`border ${
                    document.validityStatus === 'expired'
                      ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20'
                      : document.validityStatus === 'expiring_soon'
                      ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/20'
                      : 'border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633]'
                  } shadow-sm rounded-xl hover:shadow-md transition-shadow`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {document.originalFileName}
                          </h3>
                          {getValidityStatusBadge(document.validityStatus)}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span>
                            <strong>Şirket:</strong> {document.companyId.name}
                          </span>
                          {document.counterpartyCompanyId && (
                            <span>
                              <strong>Karşı Taraf:</strong> {document.counterpartyCompanyId.name}
                            </span>
                          )}
                          <span>
                            <strong>Tip:</strong> {documentTypeLabels[document.documentType] || document.documentType}
                          </span>
                          <span>
                            <strong>Boyut:</strong> {formatFileSize(document.fileSize)}
                          </span>
                        </div>

                        {document.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {document.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                          <span>
                            <strong>Geçerlilik:</strong>{' '}
                            {format(new Date(document.validityStartDate), 'dd MMM yyyy', { locale: tr })} -{' '}
                            {format(new Date(document.validityEndDate), 'dd MMM yyyy', { locale: tr })}
                          </span>
                          {document.uploadedBy && (
                            <span>
                              <strong>Yükleyen:</strong> {document.uploadedBy.name}
                            </span>
                          )}
                          <span>
                            <strong>Yüklenme:</strong>{' '}
                            {format(new Date(document.createdAt), 'dd MMM yyyy', { locale: tr })}
                          </span>
                        </div>

                        {document.tags && document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {document.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(document)}
                        >
                          <span className="material-symbols-outlined text-lg mr-2">download</span>
                          İndir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Sayfa {page} / {totalPages} (Toplam {total} doküman)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (page > 1) {
                        setPage(page - 1);
                      }
                    }}
                    disabled={page === 1}
                  >
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (page < totalPages) {
                        setPage(page + 1);
                      }
                    }}
                    disabled={page === totalPages}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


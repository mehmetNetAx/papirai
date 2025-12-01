'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DocumentType } from '@/lib/db/models/CompanyDocument';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CompanyDocument {
  _id: string;
  originalFileName: string;
  documentType: DocumentType;
  validityStartDate: string;
  validityEndDate: string;
  description?: string;
  counterpartyCompany?: {
    _id: string;
    name: string;
  } | null;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  } | null;
  sourceCompany?: string;
  sourceCompanyId?: string;
}

interface DocumentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  counterpartyCompanyId?: string;
  onSelect: (documentIds: string[]) => void;
  selectedDocumentIds?: string[];
  allCompanies?: Array<{ _id: string; name: string }>;
}

const documentTypeLabels: Record<DocumentType, string> = {
  ek_protokol: 'Ek Protokol',
  ek: 'Ek',
  imza_sirkusu: 'İmza Sirküsü',
  vergi_levhasi: 'Vergi Levhası',
  ticaret_sicil_gazetesi: 'Ticaret Sicil Gazetesi',
  yetki_belgesi: 'Yetki Belgesi',
  diger: 'Diğer',
};

function getValidityStatus(validityEndDate: string): 'valid' | 'expiring_soon' | 'expired' {
  const now = new Date();
  const endDate = new Date(validityEndDate);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 30) return 'expiring_soon';
  return 'valid';
}

function getValidityStatusColor(status: 'valid' | 'expiring_soon' | 'expired'): string {
  switch (status) {
    case 'expired':
      return 'text-red-600 dark:text-red-400';
    case 'expiring_soon':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-green-600 dark:text-green-400';
  }
}

function getValidityStatusLabel(status: 'valid' | 'expiring_soon' | 'expired'): string {
  switch (status) {
    case 'expired':
      return 'Süresi Dolmuş';
    case 'expiring_soon':
      return 'Yakında Geçecek';
    default:
      return 'Geçerli';
  }
}

export default function DocumentSelector({
  open,
  onOpenChange,
  companyId,
  counterpartyCompanyId,
  onSelect,
  selectedDocumentIds = [],
  allCompanies = [],
}: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Memoize selectedDocumentIds to prevent unnecessary re-renders
  const memoizedSelectedDocumentIds = useMemo(() => selectedDocumentIds, [selectedDocumentIds.join(',')]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(memoizedSelectedDocumentIds));
  
  // Normalize counterpartyCompanyId - ensure it's a valid string
  const normalizedCounterpartyCompanyId = counterpartyCompanyId && typeof counterpartyCompanyId === 'string' && counterpartyCompanyId.trim() !== '' ? counterpartyCompanyId : undefined;
  
  const [localCompanies, setLocalCompanies] = useState<Array<{ _id: string; name: string }>>(allCompanies);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<'all' | 'company' | 'counterparty'>('all');
  const [filters, setFilters] = useState({
    documentType: 'all' as DocumentType | 'all',
    validityStatus: 'all' as 'valid' | 'expiring_soon' | 'expired' | 'all',
    search: '',
  });

  // Update localCompanies when allCompanies prop changes
  useEffect(() => {
    if (allCompanies.length > 0) {
      setLocalCompanies(allCompanies);
    }
  }, [allCompanies]);

  const loadDocuments = async () => {
    if (!open) return; // Don't load if dialog is closed
    
    setLoading(true);
    setError(null);
    try {
      const allDocuments: CompanyDocument[] = [];
      
      // Load documents from both companies if both exist
      const companiesToLoad: Array<{ id: string; name: string }> = [];
      
      // Use localCompanies which may be updated from API
      const companiesList = localCompanies.length > 0 ? localCompanies : allCompanies;
      
      // Determine which companies to load based on filter
      if (selectedCompanyFilter === 'all' || selectedCompanyFilter === 'company') {
        if (companyId) {
          const companyName = companiesList.find(c => c._id === companyId)?.name || 'Bizim Şirket';
          companiesToLoad.push({ id: companyId, name: companyName });
        }
      }
      
      if (normalizedCounterpartyCompanyId && (selectedCompanyFilter === 'all' || selectedCompanyFilter === 'counterparty')) {
        const counterpartyName = companiesList.find(c => c._id === normalizedCounterpartyCompanyId)?.name || 'Karşı Taraf Şirketi';
        companiesToLoad.push({ 
          id: normalizedCounterpartyCompanyId, 
          name: counterpartyName
        });
      }

      // If no companies to load, show error
      if (companiesToLoad.length === 0) {
        setError('Seçilebilir şirket bulunamadı');
        setDocuments([]);
        setLoading(false);
        return;
      }

      // Fetch documents from each company
      const errors: string[] = [];
      for (const company of companiesToLoad) {
        try {
          const params = new URLSearchParams({
            ...(filters.documentType && filters.documentType !== 'all' && { documentType: filters.documentType }),
            ...(filters.validityStatus && filters.validityStatus !== 'all' && { validityStatus: filters.validityStatus }),
            ...(filters.search && { search: filters.search }),
          });

          const response = await fetch(`/api/companies/${company.id}/documents?${params}`);
          if (response.ok) {
            const data = await response.json();
            const companyDocs = (data.documents || []).map((doc: any) => ({
              ...doc,
              sourceCompany: company.name,
              sourceCompanyId: company.id,
            }));
            allDocuments.push(...companyDocs);
          } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `Şirket "${company.name}" için dokümanlar yüklenemedi`;
            console.warn(`Failed to load documents for company ${company.id}:`, errorMsg);
            errors.push(errorMsg);
          }
        } catch (err: any) {
          const errorMsg = `Şirket "${company.name}" için dokümanlar yüklenirken hata: ${err.message || 'Bilinmeyen hata'}`;
          console.error(`Error loading documents for company ${company.id}:`, err);
          errors.push(errorMsg);
        }
      }

      // Show error only if no documents were loaded
      if (errors.length > 0 && allDocuments.length === 0) {
        setError(errors.join('; '));
      } else if (errors.length > 0) {
        // If some documents loaded but there were errors, show warning but don't block
        console.warn('Some documents could not be loaded:', errors);
      }

      setDocuments(allDocuments);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Dokümanlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(memoizedSelectedDocumentIds));
      // Reset filters when opening
      setFilters({
        documentType: 'all',
        validityStatus: 'all',
        search: '',
      });
      // Set default company filter - always show 'all' if counterparty exists
      if (normalizedCounterpartyCompanyId) {
        setSelectedCompanyFilter('all');
      } else {
        setSelectedCompanyFilter('company');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, normalizedCounterpartyCompanyId, memoizedSelectedDocumentIds]);
  
  // Update selectedIds when selectedDocumentIds prop changes
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(memoizedSelectedDocumentIds));
    }
  }, [open, memoizedSelectedDocumentIds]);

  // Load companies if not provided
  useEffect(() => {
    if (open && localCompanies.length === 0 && allCompanies.length === 0) {
      fetch('/api/companies')
        .then((res) => res.json())
        .then((data) => {
          const companyList = (data.companies || []).map((c: any) => ({
            _id: c._id.toString(),
            name: c.name,
          }));
          if (companyList.length > 0) {
            setLocalCompanies(companyList);
          }
        })
        .catch((err) => console.error('Error fetching companies:', err));
    }
  }, [open, localCompanies.length, allCompanies.length]);

  // Load documents when dialog opens or filters change
  useEffect(() => {
    if (open && (companyId || normalizedCounterpartyCompanyId)) {
      const timer = setTimeout(() => {
        loadDocuments();
      }, 200); // Give time for companies to load
      return () => clearTimeout(timer);
    }
  }, [
    open, 
    companyId, 
    normalizedCounterpartyCompanyId, 
    selectedCompanyFilter, 
    filters.documentType, 
    filters.validityStatus, 
    filters.search
  ]);

  const handleToggleSelect = (documentId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedIds));
    onOpenChange(false);
  };

  const filteredDocuments = documents.filter((doc) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !doc.originalFileName.toLowerCase().includes(searchLower) &&
        !(doc.description?.toLowerCase().includes(searchLower))
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col bg-white dark:bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 font-display">
            Doküman Seç
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Şirket arşivinden doküman seçin
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Filters */}
          <div className={`grid gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/30 ${normalizedCounterpartyCompanyId ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
            <div className="space-y-2">
              <Label htmlFor="filter-company">Şirket Seçimi *</Label>
              <Select
                value={selectedCompanyFilter}
                onValueChange={(value) => {
                  setSelectedCompanyFilter(value as 'all' | 'company' | 'counterparty');
                }}
              >
                <SelectTrigger id="filter-company" className="bg-white dark:bg-gray-800">
                  <SelectValue placeholder="Şirket seçin" />
                </SelectTrigger>
                <SelectContent>
                  {normalizedCounterpartyCompanyId ? (
                    <>
                      <SelectItem value="all">Tüm Şirketler</SelectItem>
                      <SelectItem value="company">
                        {localCompanies.find(c => c._id === companyId)?.name || allCompanies.find(c => c._id === companyId)?.name || 'Bizim Şirket'}
                      </SelectItem>
                      <SelectItem value="counterparty">
                        {localCompanies.find(c => c._id === normalizedCounterpartyCompanyId)?.name || allCompanies.find(c => c._id === normalizedCounterpartyCompanyId)?.name || 'Karşı Taraf Şirketi'}
                      </SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="company">
                        {localCompanies.find(c => c._id === companyId)?.name || allCompanies.find(c => c._id === companyId)?.name || 'Bizim Şirket'}
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Hangi şirketin arşivinden doküman seçmek istediğinizi belirleyin</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-type">Doküman Tipi</Label>
              <Select
                value={filters.documentType}
                onValueChange={(value) => setFilters({ ...filters, documentType: value as DocumentType | 'all' })}
              >
                <SelectTrigger id="filter-type">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-validity">Geçerlilik Durumu</Label>
              <Select
                value={filters.validityStatus}
                onValueChange={(value) => setFilters({ ...filters, validityStatus: value as 'valid' | 'expiring_soon' | 'expired' | 'all' })}
              >
                <SelectTrigger id="filter-validity">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="valid">Geçerli</SelectItem>
                  <SelectItem value="expiring_soon">Yakında Geçecek</SelectItem>
                  <SelectItem value="expired">Süresi Dolmuş</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-search">Ara</Label>
              <Input
                id="filter-search"
                placeholder="Dosya adı veya açıklama..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && <p className="text-center text-gray-500 py-4">Yükleniyor...</p>}

          {!loading && filteredDocuments.length === 0 && (
            <p className="text-center text-gray-500 py-4">Doküman bulunamadı</p>
          )}

          {!loading && filteredDocuments.length > 0 && (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => {
                const validityStatus = getValidityStatus(doc.validityEndDate);
                const isSelected = selectedIds.has(doc._id);

                return (
                  <div
                    key={doc._id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200/50 dark:border-[#324d67]/50 bg-white dark:bg-[#111a22]'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleSelect(doc._id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {doc.originalFileName}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${getValidityStatusColor(validityStatus)}`}
                        >
                          {getValidityStatusLabel(validityStatus)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {documentTypeLabels[doc.documentType]}
                        {doc.counterpartyCompany && ` • ${doc.counterpartyCompany.name}`}
                        {(doc as any).sourceCompany && ` • Şirket: ${(doc as any).sourceCompany}`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Geçerlilik: {format(new Date(doc.validityStartDate), 'dd MMM yyyy', { locale: tr })} -{' '}
                        {format(new Date(doc.validityEndDate), 'dd MMM yyyy', { locale: tr })}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{doc.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            Seç ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


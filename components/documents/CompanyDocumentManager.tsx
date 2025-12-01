'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  tags?: string[];
  counterpartyCompany?: {
    _id: string;
    name: string;
  } | null;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  } | null;
  downloadUrl?: string;
}

interface Company {
  _id: string;
  name: string;
}

interface CompanyDocumentManagerProps {
  companyId: string;
  canEdit?: boolean;
  counterpartyCompanies?: Company[];
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
      return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
    case 'expiring_soon':
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
    default:
      return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function CompanyDocumentManager({
  companyId,
  canEdit = true,
  counterpartyCompanies = [],
}: CompanyDocumentManagerProps) {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    documentType: '' as DocumentType | '',
    counterpartyCompanyId: '',
    validityStartDate: '',
    validityEndDate: '',
    description: '',
    tags: '',
  });

  const [filters, setFilters] = useState({
    documentType: 'all' as DocumentType | 'all',
    validityStatus: 'all' as 'valid' | 'expiring_soon' | 'expired' | 'all',
    counterpartyCompanyId: 'all',
    search: '',
  });

  useEffect(() => {
    loadDocuments();
  }, [companyId, filters]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        ...(filters.documentType && filters.documentType !== 'all' && { documentType: filters.documentType }),
        ...(filters.validityStatus && filters.validityStatus !== 'all' && { validityStatus: filters.validityStatus }),
        ...(filters.counterpartyCompanyId && filters.counterpartyCompanyId !== 'all' && { counterpartyCompanyId: filters.counterpartyCompanyId }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/companies/${companyId}/documents?${params}`);
      if (!response.ok) {
        throw new Error('Dokümanlar yüklenemedi');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Dokümanlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        setError(`Dosya boyutu çok büyük. Maksimum ${MAX_FILE_SIZE / (1024 * 1024)}MB dosya yükleyebilirsiniz.`);
        return;
      }
      setUploadForm({ ...uploadForm, file });
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      setError('Lütfen bir dosya seçin.');
      return;
    }

    if (!uploadForm.documentType) {
      setError('Lütfen doküman tipini seçin.');
      return;
    }

    if (!uploadForm.validityStartDate || !uploadForm.validityEndDate) {
      setError('Lütfen geçerlilik tarihlerini girin.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('documentType', uploadForm.documentType);
      if (uploadForm.counterpartyCompanyId) {
        formData.append('counterpartyCompanyId', uploadForm.counterpartyCompanyId);
      }
      formData.append('validityStartDate', uploadForm.validityStartDate);
      formData.append('validityEndDate', uploadForm.validityEndDate);
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }
      if (uploadForm.tags) {
        formData.append('tags', uploadForm.tags);
      }

      const response = await fetch(`/api/companies/${companyId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dosya yüklenirken bir hata oluştu');
      }

      setUploadForm({
        file: null,
        documentType: '' as DocumentType | '',
        counterpartyCompanyId: '',
        validityStartDate: '',
        validityEndDate: '',
        description: '',
        tags: '',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowUploadDialog(false);
      await loadDocuments();
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Dosya yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Bu dokümanı silmek istediğinizden emin misiniz?')) {
      return;
    }

    setDeleting(documentId);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Doküman silinirken bir hata oluştu');
      }

      await loadDocuments();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Doküman silinirken bir hata oluştu');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/documents/${documentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dosya indirme bağlantısı alınırken bir hata oluştu');
      }
      const data = await response.json();
      window.open(data.document.downloadUrl, '_blank');
    } catch (err: any) {
      console.error('Error downloading file:', err);
      setError(err.message || 'Dosya indirilirken bir hata oluştu');
    }
  };

  const expiredCount = documents.filter(d => getValidityStatus(d.validityEndDate) === 'expired').length;
  const expiringSoonCount = documents.filter(d => getValidityStatus(d.validityEndDate) === 'expiring_soon').length;

  return (
    <>
      <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
              Doküman Arşivi ({documents.length})
            </CardTitle>
            {canEdit && (
              <Button onClick={() => setShowUploadDialog(true)} disabled={uploading}>
                <span className="material-symbols-outlined text-base mr-2">upload_file</span>
                Yeni Doküman Yükle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/30">
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

            {counterpartyCompanies.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="filter-counterparty">Karşı Taraf</Label>
                <Select
                  value={filters.counterpartyCompanyId}
                  onValueChange={(value) => setFilters({ ...filters, counterpartyCompanyId: value })}
                >
                  <SelectTrigger id="filter-counterparty">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {counterpartyCompanies.map((company) => (
                      <SelectItem key={company._id} value={company._id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

          {/* Warnings */}
          {expiredCount > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>{expiredCount} dokümanın süresi dolmuş.</strong> Lütfen güncel versiyonları yükleyin.
              </AlertDescription>
            </Alert>
          )}

          {expiringSoonCount > 0 && (
            <Alert>
              <AlertDescription>
                <strong>{expiringSoonCount} doküman yakında süresi dolacak.</strong> Lütfen kontrol edin.
              </AlertDescription>
            </Alert>
          )}

          {loading && <p className="text-center text-gray-500">Dokümanlar yükleniyor...</p>}

          {!loading && documents.length === 0 && (
            <p className="text-center text-gray-500">Henüz bir doküman yüklenmedi.</p>
          )}

          {!loading && documents.length > 0 && (
            <div className="space-y-3">
              {documents.map((doc) => {
                const status = getValidityStatus(doc.validityEndDate);
                return (
                  <div
                    key={doc._id}
                    className={`flex flex-wrap items-center justify-between p-3 rounded-lg border ${getValidityStatusColor(status)}`}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {doc.originalFileName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {documentTypeLabels[doc.documentType]}
                        {doc.counterpartyCompany && ` • ${doc.counterpartyCompany.name}`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Geçerlilik: {format(new Date(doc.validityStartDate), 'dd MMM yyyy', { locale: tr })} -{' '}
                        {format(new Date(doc.validityEndDate), 'dd MMM yyyy', { locale: tr })}
                        {' • '}
                        {getValidityStatusLabel(status)}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{doc.description}</p>
                      )}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc._id)}
                        disabled={uploading || deleting === doc._id}
                      >
                        <span className="material-symbols-outlined text-base mr-1">download</span>
                        İndir
                      </Button>
                      {canEdit && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(doc._id)}
                          disabled={uploading || deleting === doc._id}
                        >
                          <span className="material-symbols-outlined text-base mr-1">delete</span>
                          Sil
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 font-display">
              Yeni Doküman Yükle
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Şirket arşivine doküman yükleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-file">Dosya Seç *</Label>
              <Input
                id="upload-file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-type">Doküman Tipi *</Label>
              <Select
                value={uploadForm.documentType}
                onValueChange={(value) => setUploadForm({ ...uploadForm, documentType: value as DocumentType })}
                disabled={uploading}
              >
                <SelectTrigger id="upload-type">
                  <SelectValue placeholder="Doküman tipini seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {counterpartyCompanies.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="upload-counterparty">Karşı Taraf (Opsiyonel)</Label>
                <Select
                  value={uploadForm.counterpartyCompanyId || 'none'}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, counterpartyCompanyId: value === 'none' ? '' : value })}
                  disabled={uploading}
                >
                  <SelectTrigger id="upload-counterparty">
                    <SelectValue placeholder="Karşı taraf seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    {counterpartyCompanies.map((company) => (
                      <SelectItem key={company._id} value={company._id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upload-start-date">Geçerlilik Başlangıç Tarihi *</Label>
                <Input
                  id="upload-start-date"
                  type="date"
                  value={uploadForm.validityStartDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, validityStartDate: e.target.value })}
                  disabled={uploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-end-date">Geçerlilik Bitiş Tarihi *</Label>
                <Input
                  id="upload-end-date"
                  type="date"
                  value={uploadForm.validityEndDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, validityEndDate: e.target.value })}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-description">Açıklama (Opsiyonel)</Label>
              <Input
                id="upload-description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                disabled={uploading}
                placeholder="Doküman açıklaması..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-tags">Etiketler (Opsiyonel, virgülle ayırın)</Label>
              <Input
                id="upload-tags"
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                disabled={uploading}
                placeholder="etiket1, etiket2, etiket3"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
              İptal
            </Button>
            <Button onClick={handleUpload} disabled={!uploadForm.file || !uploadForm.documentType || !uploadForm.validityStartDate || !uploadForm.validityEndDate || uploading}>
              {uploading ? 'Yükleniyor...' : 'Yükle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


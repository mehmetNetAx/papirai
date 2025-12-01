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
import DocumentSelector from '@/components/documents/DocumentSelector';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { DocumentType } from '@/lib/db/models/CompanyDocument';
import type { AttachmentType } from '@/lib/db/models/ContractAttachment';

interface CompanyDocument {
  _id: string;
  originalFileName: string;
  documentType: DocumentType;
  validityStartDate: string;
  validityEndDate: string;
  description?: string;
  downloadUrl: string;
  counterpartyCompany?: {
    _id: string;
    name: string;
  } | null;
  validityStatus?: 'valid' | 'expiring_soon' | 'expired';
  daysRemaining?: number | null;
}

interface ContractAttachment {
  _id: string;
  originalFileName: string;
  attachmentType: string;
  description?: string;
  downloadUrl: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  } | null;
  createdAt?: string;
}

interface ContractDocumentsManagerProps {
  contractId: string;
  companyId: string;
  counterpartyCompanyId?: string;
  counterpartyName?: string; // Counterparty name as string (for backward compatibility)
  canEdit?: boolean;
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

const attachmentTypeLabels: Record<AttachmentType, string> = {
  ek_protokol: 'Ek Protokol',
  ek: 'Ek',
  imza_sirkusu: 'İmza Sirküsü',
  vergi_levhasi: 'Vergi Levhası',
  ticaret_sicil_gazetesi: 'Ticaret Sicil Gazetesi',
  yetki_belgesi: 'Yetki Belgesi',
  diger: 'Diğer',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

function getValidityStatusLabel(status: 'valid' | 'expiring_soon' | 'expired', daysRemaining?: number | null): string {
  switch (status) {
    case 'expired':
      return 'Süresi Dolmuş';
    case 'expiring_soon':
      return daysRemaining ? `${daysRemaining} gün sonra geçecek` : 'Yakında Geçecek';
    default:
      return 'Geçerli';
  }
}

export default function ContractDocumentsManager({
  contractId,
  companyId,
  counterpartyCompanyId,
  counterpartyName,
  canEdit = true,
}: ContractDocumentsManagerProps) {
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);
  const [contractAttachments, setContractAttachments] = useState<ContractAttachment[]>([]);
  const [validityStatus, setValidityStatus] = useState<{
    valid: CompanyDocument[];
    expiringSoon: CompanyDocument[];
    expired: CompanyDocument[];
  }>({
    valid: [],
    expiringSoon: [],
    expired: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [allCompanies, setAllCompanies] = useState<Array<{ _id: string; name: string }>>([]);
  const [resolvedCounterpartyCompanyId, setResolvedCounterpartyCompanyId] = useState<string | undefined>(counterpartyCompanyId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    attachmentType: '' as AttachmentType | '',
    description: '',
  });

  useEffect(() => {
    loadDocuments();
    fetchAllCompanies();
  }, [contractId]);

  // Resolve counterpartyCompanyId from counterpartyName if not provided
  useEffect(() => {
    if (!counterpartyCompanyId && counterpartyName && allCompanies.length > 0) {
      const foundCompany = allCompanies.find(c => 
        c.name.toLowerCase().trim() === counterpartyName.toLowerCase().trim()
      );
      if (foundCompany) {
        setResolvedCounterpartyCompanyId(foundCompany._id);
      }
    } else if (counterpartyCompanyId) {
      setResolvedCounterpartyCompanyId(counterpartyCompanyId);
    } else {
      setResolvedCounterpartyCompanyId(undefined);
    }
  }, [counterpartyCompanyId, counterpartyName, allCompanies]);

  const fetchAllCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setAllCompanies((data.companies || []).map((c: any) => ({
          _id: c._id.toString(),
          name: c.name,
        })));
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Add cache-busting query parameter to ensure fresh data
      const response = await fetch(`/api/contracts/${contractId}/documents?t=${Date.now()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Dokümanlar yüklenemedi');
      }

      const data = await response.json();
      console.log('Loaded documents:', {
        companyDocuments: data.companyDocuments?.length || 0,
        contractAttachments: data.contractAttachments?.length || 0,
        total: (data.companyDocuments?.length || 0) + (data.contractAttachments?.length || 0)
      });
      setCompanyDocuments(data.companyDocuments || []);
      setContractAttachments(data.contractAttachments || []);
      setValidityStatus(data.validityStatus || { valid: [], expiringSoon: [], expired: [] });
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Dokümanlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDocuments = async (documentIds: string[]) => {
    setAttaching(true);
    setError(null);
    try {
      const results = [];
      for (const docId of documentIds) {
        const response = await fetch(`/api/contracts/${contractId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: docId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Doküman eklenirken bir hata oluştu');
        }
        
        const result = await response.json();
        results.push(result);
      }

      // Reload documents after all are attached
      console.log('Documents attached successfully, reloading...');
      await loadDocuments();
      setShowDocumentSelector(false);
    } catch (err: any) {
      console.error('Error attaching documents:', err);
      setError(err.message || 'Dokümanlar eklenirken bir hata oluştu');
      // Still reload documents in case some were successfully attached
      await loadDocuments();
    } finally {
      setAttaching(false);
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!confirm('Bu dokümanı sözleşmeden kaldırmak istediğinizden emin misiniz?')) {
      return;
    }

    setAttaching(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Doküman kaldırılırken bir hata oluştu');
      }

      await loadDocuments();
    } catch (err: any) {
      console.error('Error removing document:', err);
      setError(err.message || 'Doküman kaldırılırken bir hata oluştu');
    } finally {
      setAttaching(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Bu eki silmek istediğinizden emin misiniz?')) {
      return;
    }

    setDeleting(attachmentId);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ek silinirken bir hata oluştu');
      }

      await loadDocuments();
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      setError(err.message || 'Ek silinirken bir hata oluştu');
    } finally {
      setDeleting(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('Dosya boyutu 50MB\'dan büyük olamaz');
        return;
      }
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.attachmentType) {
      setError('Dosya ve ek tipi seçilmelidir');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('attachmentType', uploadForm.attachmentType);
      if (uploadForm.description) {
        formData.append('description', uploadForm.description);
      }

      const response = await fetch(`/api/contracts/${contractId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Dosya yüklenirken bir hata oluştu');
      }

      await loadDocuments();
      
      // Reset form
      setUploadForm({
        file: null,
        attachmentType: '',
        description: '',
      });
      setShowUploadDialog(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error uploading attachment:', err);
      setError(err.message || 'Dosya yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (downloadUrl: string) => {
    window.open(downloadUrl, '_blank');
  };

  const totalDocuments = companyDocuments.length + contractAttachments.length;
  const hasExpired = validityStatus.expired.length > 0;
  const hasExpiringSoon = validityStatus.expiringSoon.length > 0;

  return (
    <>
      <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
              Sözleşme Dokümanları ({totalDocuments})
            </CardTitle>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(true)}
                  disabled={uploading || attaching}
                  size="sm"
                >
                  <span className="material-symbols-outlined text-base mr-2">upload_file</span>
                  Direkt Yükle
                </Button>
                <Button
                  onClick={() => setShowDocumentSelector(true)}
                  disabled={attaching || uploading}
                  size="sm"
                >
                  <span className="material-symbols-outlined text-base mr-2">add</span>
                  Arşivden Ekle
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Validity Warnings */}
          {hasExpired && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>{validityStatus.expired.length} dokümanın süresi dolmuş.</strong> Lütfen güncel versiyonları yükleyin.
              </AlertDescription>
            </Alert>
          )}

          {hasExpiringSoon && (
            <Alert>
              <AlertDescription>
                <strong>{validityStatus.expiringSoon.length} doküman yakında süresi dolacak.</strong> Lütfen kontrol edin.
              </AlertDescription>
            </Alert>
          )}

          {loading && <p className="text-center text-gray-500">Dokümanlar yükleniyor...</p>}

          {!loading && totalDocuments === 0 && (
            <p className="text-center text-gray-500">Bu sözleşmeye henüz bir doküman eklenmedi.</p>
          )}

          {/* All Documents - Unified List */}
          {!loading && totalDocuments > 0 && (
            <div className="space-y-3">
              {/* Company Documents (from archive) */}
              {companyDocuments.map((doc) => {
                const status = doc.validityStatus || 'valid';
                return (
                  <div
                    key={doc._id}
                    className={`flex flex-wrap items-center justify-between p-3 rounded-lg border ${getValidityStatusColor(status)}`}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {doc.originalFileName}
                        </p>
                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          Arşivden
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {documentTypeLabels[doc.documentType]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {doc.counterpartyCompany && `${doc.counterpartyCompany.name} • `}
                        Geçerlilik: {format(new Date(doc.validityStartDate), 'dd MMM yyyy', { locale: tr })} -{' '}
                        {format(new Date(doc.validityEndDate), 'dd MMM yyyy', { locale: tr })}
                        {' • '}
                        {getValidityStatusLabel(status, doc.daysRemaining)}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{doc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc.downloadUrl)}
                        disabled={attaching || uploading}
                      >
                        <span className="material-symbols-outlined text-base mr-1">download</span>
                        İndir
                      </Button>
                      {canEdit && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveDocument(doc._id)}
                          disabled={attaching || uploading}
                        >
                          <span className="material-symbols-outlined text-base mr-1">delete</span>
                          Kaldır
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Contract Attachments (direct uploads) */}
              {contractAttachments.map((attachment) => (
                <div
                  key={attachment._id}
                  className="flex flex-wrap items-center justify-between p-3 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50 bg-white dark:bg-[#111a22]"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {attachment.originalFileName}
                      </p>
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        Direkt Yükleme
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {attachmentTypeLabels[attachment.attachmentType as AttachmentType] || attachment.attachmentType}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {attachment.uploadedBy && `${attachment.uploadedBy.name} • `}
                      {attachment.createdAt && new Date(attachment.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                    {attachment.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{attachment.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(attachment.downloadUrl)}
                      disabled={attaching || uploading}
                    >
                      <span className="material-symbols-outlined text-base mr-1">download</span>
                      İndir
                    </Button>
                    {canEdit && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAttachment(attachment._id)}
                        disabled={attaching || uploading || deleting === attachment._id}
                      >
                        <span className="material-symbols-outlined text-base">
                          {deleting === attachment._id ? 'hourglass_empty' : 'delete'}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentSelector
        open={showDocumentSelector}
        onOpenChange={setShowDocumentSelector}
        companyId={companyId}
        counterpartyCompanyId={resolvedCounterpartyCompanyId}
        onSelect={handleSelectDocuments}
        selectedDocumentIds={companyDocuments.map(d => d._id)}
        allCompanies={allCompanies}
      />

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Doküman Yükle</DialogTitle>
            <DialogDescription>
              Sözleşmeye ek protokol, ek, imza sirküsü, vergi levhası veya diğer dokümanları yükleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="attachmentType">Doküman Tipi *</Label>
              <Select
                value={uploadForm.attachmentType}
                onValueChange={(value) => setUploadForm({ ...uploadForm, attachmentType: value as AttachmentType })}
              >
                <SelectTrigger id="attachmentType">
                  <SelectValue placeholder="Doküman tipi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(attachmentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Dosya *</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              />
              {uploadForm.file && (
                <p className="text-sm text-gray-500">
                  Seçilen: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                </p>
              )}
              <p className="text-xs text-gray-500">Maksimum dosya boyutu: 50MB</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
              <Input
                id="description"
                placeholder="Doküman hakkında açıklama"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setUploadForm({ file: null, attachmentType: '', description: '' });
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={uploading}
            >
              İptal
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadForm.file || !uploadForm.attachmentType}>
              <span className="material-symbols-outlined text-base mr-2">
                {uploading ? 'hourglass_empty' : 'upload_file'}
              </span>
              {uploading ? 'Yükleniyor...' : 'Yükle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


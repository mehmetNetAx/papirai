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
import type { AttachmentType } from '@/lib/db/models/ContractAttachment';

interface Attachment {
  _id: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  attachmentType: AttachmentType;
  description?: string;
  downloadUrl: string | null;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

interface ContractAttachmentsProps {
  contractId: string;
  canEdit?: boolean;
}

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

export default function ContractAttachments({ contractId, canEdit = true }: ContractAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    attachmentType: '' as AttachmentType | '',
    description: '',
  });

  useEffect(() => {
    loadAttachments();
  }, [contractId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/contracts/${contractId}/attachments`);
      
      if (!response.ok) {
        throw new Error('Ekler yüklenemedi');
      }
      
      const data = await response.json();
      setAttachments(data.attachments || []);
    } catch (err: any) {
      console.error('Error loading attachments:', err);
      setError(err.message || 'Ekler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
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

      // Reload attachments
      await loadAttachments();
      
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

  const handleDelete = async (attachmentId: string) => {
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

      // Reload attachments
      await loadAttachments();
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      setError(err.message || 'Ek silinirken bir hata oluştu');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    if (attachment.downloadUrl) {
      window.open(attachment.downloadUrl, '_blank');
    } else {
      // Fallback: fetch download URL
      try {
        const response = await fetch(`/api/contracts/${contractId}/attachments/${attachment._id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.downloadUrl) {
            window.open(data.downloadUrl, '_blank');
          }
        }
      } catch (err) {
        console.error('Error getting download URL:', err);
        setError('İndirme bağlantısı alınamadı');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ekler ve Dokümanlar</CardTitle>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadDialog(true)}
            >
              <span className="material-symbols-outlined text-base mr-2">upload_file</span>
              Ekle
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Henüz ek yüklenmemiş
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment._id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-gray-500">
                      description
                    </span>
                    <span className="font-medium truncate">{attachment.originalFileName}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {attachmentTypeLabels[attachment.attachmentType]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-x-3">
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    {attachment.description && (
                      <span>• {attachment.description}</span>
                    )}
                    <span>
                      • {new Date(attachment.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                    {attachment.uploadedBy && (
                      <span>• {attachment.uploadedBy.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                  >
                    <span className="material-symbols-outlined text-base mr-1">download</span>
                    İndir
                  </Button>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(attachment._id)}
                      disabled={deleting === attachment._id}
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

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ek Yükle</DialogTitle>
            <DialogDescription>
              Sözleşmeye ek protokol, ek, imza sirküsü, vergi levhası veya diğer dokümanları yükleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="attachmentType">Ek Tipi *</Label>
              <Select
                value={uploadForm.attachmentType}
                onValueChange={(value) => setUploadForm({ ...uploadForm, attachmentType: value as AttachmentType })}
              >
                <SelectTrigger id="attachmentType">
                  <SelectValue placeholder="Ek tipi seçin" />
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
                placeholder="Ek hakkında açıklama"
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
    </Card>
  );
}


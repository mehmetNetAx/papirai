'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdvancedContractEditor from '@/components/editor/AdvancedContractEditor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Workspace {
  _id: string;
  name: string;
  description?: string;
}

interface NewContractFormProps {
  workspaces: Workspace[];
  userId: string;
  userName: string;
  onSave: (
    title: string,
    workspaceId: string,
    content: string,
    startDate: string,
    endDate: string,
    contractType: string,
    counterparty: string,
    currency: string,
    contractValue: number,
    variables?: Array<{ name: string; description: string }>
  ) => Promise<void>;
  preselectedWorkspaceId?: string;
}

export default function NewContractForm({
  workspaces,
  userId,
  userName,
  onSave,
  preselectedWorkspaceId,
}: NewContractFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [workspaceId, setWorkspaceId] = useState(preselectedWorkspaceId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractType, setContractType] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [contractValue, setContractValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiForm, setAiForm] = useState({
    contractType: '',
    description: '',
    additionalDetails: '',
  });
  const [contentKey, setContentKey] = useState('');
  const [aiVariables, setAiVariables] = useState<Array<{ name: string; description: string }>>([]);
  
  // Contract types for combo box
  const contractTypes = [
    'Hizmet Sözleşmesi',
    'Satış Sözleşmesi',
    'Kira Sözleşmesi',
    'İstihdam Sözleşmesi',
    'Gizlilik Sözleşmesi (NDA)',
    'Yazılım Lisans Sözleşmesi',
    'Danışmanlık Sözleşmesi',
    'Distribütörlük Sözleşmesi',
    'Franchise Sözleşmesi',
    'Ortaklık Sözleşmesi',
    'Alım-Satım Sözleşmesi',
    'Diğer',
  ];
  
  // Currency options
  const currencies = [
    { value: 'TRY', label: 'Türk Lirası (₺)' },
    { value: 'USD', label: 'Amerikan Doları ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'İngiliz Sterlini (£)' },
    { value: 'JPY', label: 'Japon Yeni (¥)' },
    { value: 'CHF', label: 'İsviçre Frangı (CHF)' },
  ];
  
  // Update workspaceId if preselectedWorkspaceId changes
  useEffect(() => {
    if (preselectedWorkspaceId && workspaces.some(w => w._id.toString() === preselectedWorkspaceId)) {
      setWorkspaceId(preselectedWorkspaceId);
    }
  }, [preselectedWorkspaceId, workspaces]);

  const handleSaveClick = async () => {
    if (!title.trim()) {
      setError('Sözleşme başlığı gereklidir');
      return;
    }

    if (!workspaceId) {
      setError('Çalışma alanı seçilmelidir');
      return;
    }

    if (!startDate) {
      setError('Başlangıç tarihi gereklidir');
      return;
    }

    if (!endDate) {
      setError('Bitiş tarihi gereklidir');
      return;
    }

    // Validate that endDate is after startDate
    if (new Date(endDate) < new Date(startDate)) {
      setError('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      return;
    }

    if (!contractType) {
      setError('Sözleşme tipi seçilmelidir');
      return;
    }

    if (!counterparty.trim()) {
      setError('Karşı taraf bilgisi gereklidir');
      return;
    }

    if (!currency) {
      setError('Para birimi seçilmelidir');
      return;
    }

    // Contract value is required but can be 0 (for NDA, etc.)
    if (contractValue === '' || contractValue === null || contractValue === undefined) {
      setError('Sözleşme tutarı gereklidir (gizlilik sözleşmeleri için 0 girebilirsiniz)');
      return;
    }

    const contractValueNum = parseFloat(contractValue);
    if (isNaN(contractValueNum) || contractValueNum < 0) {
      setError('Sözleşme tutarı geçerli bir sayı olmalıdır (0 veya daha büyük)');
      return;
    }

    // Use editorContent if available, otherwise use empty string
    // editorContent should be updated by onContentChange callback
    const contentToSave = editorContent || '';
    
    if (!contentToSave || contentToSave.trim() === '' || contentToSave === '<p></p>') {
      setError('Sözleşme içeriği gereklidir');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      // Pass AI-generated variables and master variables to onSave
      await onSave(
        title, 
        workspaceId, 
        contentToSave, 
        startDate, 
        endDate,
        contractType,
        counterparty,
        currency,
        contractValueNum,
        aiVariables.length > 0 ? aiVariables : undefined
      );
      // onSave will redirect, so we don't need to do anything here
      // Clear AI variables after save
      setAiVariables([]);
    } catch (err: any) {
      console.error('Error saving contract:', err);
      setError(err.message || 'Sözleşme kaydedilirken bir hata oluştu');
      setIsSaving(false);
    }
  };

  const handleEditorSave = async (content: string, changeSummary?: string) => {
    // Update content state
    setEditorContent(content);
    
    // Trigger save
    await handleSaveClick();
  };

  const handleContentChange = (content: string) => {
    // Update content state whenever editor content changes
    setEditorContent(content);
  };

  const handleAIGenerate = async () => {
    if (!aiForm.contractType || !aiForm.description) {
      setError('Sözleşme türü ve açıklama gereklidir');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType: aiForm.contractType,
          description: aiForm.description,
          additionalDetails: aiForm.additionalDetails,
          language: 'tr',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Sözleşme oluşturulurken bir hata oluştu');
      }

      const data = await response.json();
      
      // Update editor content state first
      setEditorContent(data.content);
      
      // Store AI-generated variables for later creation
      if (data.variables && Array.isArray(data.variables)) {
        setAiVariables(data.variables);
      }
      
      // Trigger editor content update with a new key
      setContentKey(Date.now().toString());
      
      // Ensure content change callback is triggered after editor updates
      // This ensures editorContent state is in sync with editor
      setTimeout(() => {
        handleContentChange(data.content);
      }, 200);
      
      // Update title if empty
      if (!title.trim() && aiForm.contractType) {
        setTitle(aiForm.contractType);
      }

      // Close dialog
      setShowAIDialog(false);
      setAiForm({
        contractType: '',
        description: '',
        additionalDetails: '',
      });
    } catch (err: any) {
      console.error('Error generating contract:', err);
      setError(err.message || 'Sözleşme oluşturulurken bir hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  if (workspaces.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500 mb-4">
            Sözleşme oluşturmak için önce bir çalışma alanı oluşturmanız gerekiyor.
          </p>
          <Button asChild>
            <a href="/dashboard/workspaces/new">Yeni Çalışma Alanı Oluştur</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form for title and workspace */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sözleşme Bilgileri</CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAIDialog(true)}
              className="gap-2"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              Yapay Zeka ile Oluştur
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Sözleşme Başlığı *</Label>
            <Input
              id="title"
              placeholder="Örn: Master Service Agreement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace">Çalışma Alanı *</Label>
            <Select value={workspaceId} onValueChange={setWorkspaceId} required>
              <SelectTrigger id="workspace">
                <SelectValue placeholder="Çalışma alanı seçin" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace._id} value={workspace._id.toString()}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Başlangıç Tarihi *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Bitiş Tarihi *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contractType">Sözleşme Tipi *</Label>
            <Select value={contractType} onValueChange={setContractType} required>
              <SelectTrigger id="contractType">
                <SelectValue placeholder="Sözleşme tipi seçin" />
              </SelectTrigger>
              <SelectContent>
                {contractTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="counterparty">Karşı Taraf *</Label>
            <Input
              id="counterparty"
              placeholder="Örn: ABC Şirketi, Ahmet Yılmaz"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Para Birimi *</Label>
              <Select value={currency} onValueChange={setCurrency} required>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Para birimi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractValue">Sözleşme Tutarı *</Label>
              <Input
                id="contractValue"
                type="number"
                min="0"
                step="0.01"
                placeholder="0 (gizlilik sözleşmeleri için)"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">Gizlilik sözleşmeleri için 0 girebilirsiniz</p>
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveClick}
              disabled={
                isSaving || 
                !title.trim() || 
                !workspaceId || 
                !startDate || 
                !endDate || 
                !contractType || 
                !counterparty.trim() || 
                !currency || 
                contractValue === '' || 
                (!editorContent || editorContent.trim() === '' || editorContent === '<p></p>')
              }
              size="lg"
            >
              <span className="material-symbols-outlined text-base mr-2">
                {isSaving ? 'hourglass_empty' : 'save'}
              </span>
              {isSaving ? 'Kaydediliyor...' : 'Sözleşmeyi Oluştur'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <AdvancedContractEditor
        initialContent={editorContent}
        setContentKey={contentKey}
        userId={userId}
        userName={userName}
        onSave={handleEditorSave}
        onContentChange={handleContentChange}
      />

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-900">Yapay Zeka ile Sözleşme Oluştur</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-600">
              Yapay zeka, belirttiğiniz bilgilere göre profesyonel bir sözleşme metni oluşturacak.
              Kritik değişkenler {'{{DeğişkenAdı}}'} formatında otomatik olarak tanımlanacaktır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contract-type">Sözleşme Türü *</Label>
              <Input
                id="contract-type"
                placeholder="Örn: Hizmet Sözleşmesi, Satış Sözleşmesi, Kira Sözleşmesi"
                value={aiForm.contractType}
                onChange={(e) => setAiForm({ ...aiForm, contractType: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama *</Label>
              <Textarea
                id="description"
                placeholder="Sözleşmenin amacını, tarafları ve temel koşullarını açıklayın..."
                value={aiForm.description}
                onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-details">Ek Detaylar (Opsiyonel)</Label>
              <Textarea
                id="additional-details"
                placeholder="Özel koşullar, ödeme şekli, teslimat detayları vb..."
                value={aiForm.additionalDetails}
                onChange={(e) => setAiForm({ ...aiForm, additionalDetails: e.target.value })}
                rows={3}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAIDialog(false);
                setError(null);
              }}
              disabled={isGenerating}
            >
              İptal
            </Button>
            <Button onClick={handleAIGenerate} disabled={isGenerating}>
              <span className="material-symbols-outlined text-base mr-2">
                {isGenerating ? 'hourglass_empty' : 'auto_awesome'}
              </span>
              {isGenerating ? 'Oluşturuluyor...' : 'Sözleşmeyi Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


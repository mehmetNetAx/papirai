'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface MasterVariablesEditorProps {
  contractId: string;
  initialData?: {
    startDate?: string;
    endDate?: string;
    contractType?: string;
    counterparty?: string;
    currency?: string;
    contractValue?: number;
  };
}

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

const currencies = [
  { value: 'TRY', label: 'Türk Lirası (₺)' },
  { value: 'USD', label: 'Amerikan Doları ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'İngiliz Sterlini (£)' },
  { value: 'JPY', label: 'Japon Yeni (¥)' },
  { value: 'CHF', label: 'İsviçre Frangı (CHF)' },
];

export default function MasterVariablesEditor({
  contractId,
  initialData,
}: MasterVariablesEditorProps) {
  const [formData, setFormData] = useState({
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    contractType: initialData?.contractType || '',
    counterparty: initialData?.counterparty || '',
    currency: initialData?.currency || 'TRY',
    contractValue: initialData?.contractValue?.toString() || '',
  });
  const [counterpartyType, setCounterpartyType] = useState<'company' | 'manual'>('manual');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companyType, setCompanyType] = useState<'company' | 'default'>('default');
  const [companies, setCompanies] = useState<Array<{ _id: string; name: string }>>([]);
  const [currentContractCompanyId, setCurrentContractCompanyId] = useState<string>('');

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch companies and current contract
  useEffect(() => {
    // Fetch companies
    fetch('/api/companies')
      .then((res) => res.json())
      .then((data) => {
        const companyList = (data.companies || []).map((c: any) => ({
          _id: c._id.toString(),
          name: c.name,
        }));
        setCompanies(companyList);
      })
      .catch((err) => console.error('Error fetching companies:', err));

    // Fetch current contract to get companyId
    fetch(`/api/contracts/${contractId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.contract && data.contract.companyId) {
          const contractCompanyId = typeof data.contract.companyId === 'object' && data.contract.companyId._id
            ? data.contract.companyId._id.toString()
            : data.contract.companyId.toString();
          setCurrentContractCompanyId(contractCompanyId);
          setCompanyId(contractCompanyId);
        }
      })
      .catch((err) => console.error('Error fetching contract:', err));
  }, [contractId]);

  // Check for missing required fields
  useEffect(() => {
    const missing: string[] = [];
    if (!formData.startDate) missing.push('Başlangıç Tarihi');
    if (!formData.endDate) missing.push('Bitiş Tarihi');
    if (!formData.contractType) missing.push('Sözleşme Tipi');
    if (!formData.counterparty.trim()) missing.push('Karşı Taraf');
    if (!formData.currency) missing.push('Para Birimi');
    if (formData.contractValue === '' || formData.contractValue === null) {
      missing.push('Sözleşme Tutarı');
    }
    setMissingFields(missing);
  }, [formData]);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.startDate) {
      setError('Başlangıç tarihi gereklidir');
      return;
    }

    if (!formData.endDate) {
      setError('Bitiş tarihi gereklidir');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      return;
    }

    if (!formData.contractType) {
      setError('Sözleşme tipi seçilmelidir');
      return;
    }

    if (counterpartyType === 'company' && !counterpartyId) {
      setError('Lütfen bir şirket seçin');
      return;
    }
    if (counterpartyType === 'manual' && !formData.counterparty.trim()) {
      setError('Karşı taraf bilgisi gereklidir');
      return;
    }

    if (!formData.currency) {
      setError('Para birimi seçilmelidir');
      return;
    }

    if (formData.contractValue === '' || formData.contractValue === null) {
      setError('Sözleşme tutarı gereklidir (gizlilik sözleşmeleri için 0 girebilirsiniz)');
      return;
    }

    const contractValueNum = parseFloat(formData.contractValue);
    if (isNaN(contractValueNum) || contractValueNum < 0) {
      setError('Sözleşme tutarı geçerli bir sayı olmalıdır (0 veya daha büyük)');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/contracts/${contractId}/master-variables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formData.startDate,
          endDate: formData.endDate,
          contractType: formData.contractType,
          counterparty: formData.counterparty,
          counterpartyId: counterpartyType === 'company' ? counterpartyId : undefined,
          companyId: companyType === 'company' ? companyId : undefined,
          currency: formData.currency,
          contractValue: contractValueNum,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Master değişkenler kaydedilirken bir hata oluştu');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving master variables:', err);
      setError(err.message || 'Master değişkenler kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  return (
    <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
            Zorunlu Master Alanlar
          </CardTitle>
          {missingFields.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {missingFields.length} Eksik Alan
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingFields.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Eksik Alanlar:</strong> {missingFields.join(', ')}
              <br />
              <span className="text-sm mt-1 block">
                Lütfen eksik alanları doldurun. Bu bilgiler sözleşme yönetimi ve raporlama için gereklidir.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <AlertDescription className="text-green-900 dark:text-green-100">
              Master değişkenler başarıyla güncellendi!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-startDate">
              Başlangıç Tarihi * {!formData.startDate && <span className="text-red-500">(Eksik)</span>}
            </Label>
            <Input
              id="edit-startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-endDate">
              Bitiş Tarihi * {!formData.endDate && <span className="text-red-500">(Eksik)</span>}
            </Label>
            <Input
              id="edit-endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate || undefined}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-contractType">
            Sözleşme Tipi * {!formData.contractType && <span className="text-red-500">(Eksik)</span>}
          </Label>
          <Select value={formData.contractType} onValueChange={(value) => setFormData({ ...formData, contractType: value })} required>
            <SelectTrigger id="edit-contractType">
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
          <Label htmlFor="edit-company">Bizim Şirket</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={companyType === 'default' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCompanyType('default');
                  setCompanyId(currentContractCompanyId);
                }}
              >
                Varsayılan
              </Button>
              <Button
                type="button"
                variant={companyType === 'company' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCompanyType('company');
                }}
              >
                Şirket Seç
              </Button>
            </div>
            {companyType === 'company' && (
              <Select
                value={companyId}
                onValueChange={setCompanyId}
              >
                <SelectTrigger id="edit-company">
                  <SelectValue placeholder="Şirket seçin" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company._id} value={company._id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-counterparty">
            Karşı Taraf * {!formData.counterparty.trim() && <span className="text-red-500">(Eksik)</span>}
          </Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={counterpartyType === 'company' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCounterpartyType('company');
                  setFormData({ ...formData, counterparty: '' });
                }}
              >
                Şirket Seç
              </Button>
              <Button
                type="button"
                variant={counterpartyType === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCounterpartyType('manual');
                  setCounterpartyId('');
                }}
              >
                Manuel Gir
              </Button>
            </div>
            {counterpartyType === 'company' ? (
              <Select
                value={counterpartyId}
                onValueChange={(value) => {
                  setCounterpartyId(value);
                  const selectedCompany = companies.find(c => c._id === value);
                  if (selectedCompany) {
                    setFormData({ ...formData, counterparty: selectedCompany.name });
                  }
                }}
                required
              >
                <SelectTrigger id="edit-counterparty">
                  <SelectValue placeholder="Şirket seçin" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company._id} value={company._id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="edit-counterparty"
                placeholder="Örn: ABC Şirketi, Ahmet Yılmaz"
                value={formData.counterparty}
                onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
                required
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-currency">
              Para Birimi * {!formData.currency && <span className="text-red-500">(Eksik)</span>}
            </Label>
            <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })} required>
              <SelectTrigger id="edit-currency">
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
            <Label htmlFor="edit-contractValue">
              Sözleşme Tutarı * {(formData.contractValue === '' || formData.contractValue === null) && <span className="text-red-500">(Eksik)</span>}
            </Label>
            <Input
              id="edit-contractValue"
              type="number"
              min="0"
              step="0.01"
              placeholder="0 (gizlilik sözleşmeleri için)"
              value={formData.contractValue}
              onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
              required
            />
            <p className="text-xs text-gray-500">Gizlilik sözleşmeleri için 0 girebilirsiniz</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || missingFields.length > 0}
            size="lg"
          >
            <span className="material-symbols-outlined text-base mr-2">
              {isSaving ? 'hourglass_empty' : 'save'}
            </span>
            {isSaving ? 'Kaydediliyor...' : 'Master Alanları Güncelle'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


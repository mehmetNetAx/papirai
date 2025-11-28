'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MasterVariableType } from '@/lib/db/models/ContractVariable';

interface MasterVariable {
  _id: string;
  name: string;
  value: string | number | Date;
  type: string;
  masterType?: MasterVariableType;
  isMaster: boolean;
}

interface MasterVariablesManagerProps {
  contractId: string;
  variables: MasterVariable[];
  onUpdate?: () => void;
}

const masterVariableTypes: { value: MasterVariableType; label: string; description: string }[] = [
  { value: 'endDate', label: 'Bitiş Tarihi', description: 'Sözleşmenin bitiş tarihi' },
  { value: 'startDate', label: 'Başlangıç Tarihi', description: 'Sözleşmenin başlangıç tarihi' },
  { value: 'terminationPeriod', label: 'Fesih Süresi', description: 'Fesih için gerekli süre (gün)' },
  { value: 'terminationDeadline', label: 'Fesih İçin Son Tarih', description: 'Fesih için son tarih (otomatik hesaplanır)' },
  { value: 'contractValue', label: 'Sözleşme Tutarı', description: 'Sözleşmenin toplam değeri' },
  { value: 'currency', label: 'Para Birimi', description: 'Sözleşme para birimi' },
  { value: 'renewalDate', label: 'Yenileme Tarihi', description: 'Sözleşme yenileme tarihi' },
  { value: 'counterparty', label: 'Karşı Taraf', description: 'Sözleşme karşı tarafı' },
  { value: 'contractType', label: 'Sözleşme Tipi', description: 'Sözleşme tipi/kategorisi' },
  { value: 'other', label: 'Diğer', description: 'Diğer master değişken' },
];

interface MasterVariableStatusInfo {
  status: 'passed' | 'critical' | 'warning' | 'normal';
  daysRemaining: number | null;
  message: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'gray';
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export default function MasterVariablesManager({
  contractId,
  variables,
  onUpdate,
}: MasterVariablesManagerProps) {
  const [masterVars, setMasterVars] = useState<MasterVariable[]>([]);
  const [computed, setComputed] = useState<any>({});
  const [statuses, setStatuses] = useState<{
    endDate?: MasterVariableStatusInfo;
    terminationDeadline?: MasterVariableStatusInfo;
    renewalDate?: MasterVariableStatusInfo;
    overallStatus: 'passed' | 'critical' | 'warning' | 'normal';
    hasAlerts: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<MasterVariableType | ''>('');
  const [formValue, setFormValue] = useState('');
  const [formName, setFormName] = useState('');

  useEffect(() => {
    if (contractId) {
      loadMasterVariables();
    }
  }, [contractId]);

  const loadMasterVariables = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/master-variables`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load master variables');
      }
      
      const data = await response.json();
      console.log('Loaded master variables response:', data);
      
      // Ensure we have an array and map properly
      const masterVariables = Array.isArray(data.masterVariables) 
        ? data.masterVariables.map((v: any) => ({
            _id: v._id?.toString() || v._id,
            name: v.name,
            value: v.value,
            type: v.type,
            masterType: v.masterType,
            isMaster: v.isMaster !== undefined ? v.isMaster : true,
          }))
        : [];
      
      console.log('Processed master variables:', masterVariables);
      setMasterVars(masterVariables);
      setComputed(data.computed || {});
    } catch (error: any) {
      console.error('Error loading master variables:', error);
      // Don't show alert on initial load, but log it
      if (masterVars.length > 0) {
        alert('Master değişkenler yüklenirken bir hata oluştu: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetMasterVariable = async () => {
    if (!selectedType || !formValue) {
      alert('Lütfen master değişken tipi ve değerini girin.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/master-variables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterType: selectedType,
          value: formValue,
          name: formName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set master variable');
      }

      // Update state directly from response
      if (data.masterVariables && Array.isArray(data.masterVariables)) {
        setMasterVars(data.masterVariables);
        setComputed(data.computed || {});
      } else {
        // Fallback: reload from API
        await loadMasterVariables();
      }
      
      // Close dialog and reset form
      setShowDialog(false);
      setSelectedType('');
      setFormValue('');
      setFormName('');
      
      // Show success message
      console.log('Master değişken başarıyla kaydedildi:', data);
      
      onUpdate?.();
    } catch (error: any) {
      console.error('Error setting master variable:', error);
      alert(error.message || 'Master değişken ayarlanırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleFixExistingVariables = async () => {
    if (!confirm('Mevcut değişkenleri master değişken olarak işaretlemek istediğinizden emin misiniz?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/master-variables/fix`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix master variables');
      }

      alert(`${data.updated} master değişken güncellendi.`);
      await loadMasterVariables();
      onUpdate?.();
    } catch (error: any) {
      alert(error.message || 'Master değişkenler düzeltilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMaster = async (masterType: MasterVariableType) => {
    if (!confirm('Bu master değişkeni kaldırmak istediğinizden emin misiniz?')) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/contracts/${contractId}/master-variables?masterType=${masterType}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to remove master variable');

      await loadMasterVariables();
      onUpdate?.();
    } catch (error: any) {
      alert(error.message || 'Master değişken kaldırılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return 'Belirtilmemiş';
    if (value instanceof Date) return new Date(value).toLocaleDateString('tr-TR');
    if (typeof value === 'string' && type === 'date') {
      return new Date(value).toLocaleDateString('tr-TR');
    }
    if (typeof value === 'number' && type === 'currency') {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
      }).format(value);
    }
    return String(value);
  };

  const getMasterTypeLabel = (type?: MasterVariableType) => {
    return masterVariableTypes.find(t => t.value === type)?.label || type || 'Bilinmeyen';
  };

  const getInputType = (masterType: MasterVariableType) => {
    if (['endDate', 'startDate', 'terminationDeadline', 'renewalDate'].includes(masterType)) {
      return 'date';
    }
    if (['contractValue', 'terminationPeriod'].includes(masterType)) {
      return 'number';
    }
    return 'text';
  };

  return (
    <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
            Ana Değişkenler (Master Variables)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleFixExistingVariables}
              disabled={loading}
              title="Mevcut değişkenleri master değişken olarak işaretle"
            >
              <span className="material-symbols-outlined text-base mr-2">refresh</span>
              Mevcutları Düzelt
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <span className="material-symbols-outlined text-base mr-2">add</span>
                  Master Değişken Ekle
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Master Değişken Ekle/Düzenle</DialogTitle>
                <DialogDescription>
                  Sözleşme için önemli master değişkeni seçin ve değerini girin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="masterType">Master Değişken Tipi</Label>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as MasterVariableType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tip seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterVariableTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedType && (
                  <>
                    {selectedType === 'other' && (
                      <div>
                        <Label htmlFor="name">Değişken Adı</Label>
                        <Input
                          id="name"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Değişken adı"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="value">Değer</Label>
                      <Input
                        id="value"
                        type={selectedType ? getInputType(selectedType) : 'text'}
                        value={formValue}
                        onChange={(e) => setFormValue(e.target.value)}
                        placeholder={
                          selectedType === 'endDate' || selectedType === 'startDate'
                            ? 'YYYY-MM-DD'
                            : selectedType === 'contractValue' || selectedType === 'terminationPeriod'
                            ? 'Sayısal değer'
                            : 'Değer girin'
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  İptal
                </Button>
                <Button onClick={handleSetMasterVariable} disabled={!selectedType || !formValue || loading}>
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !masterVars.length ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Yükleniyor...
          </div>
        ) : masterVars.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="mb-2">Henüz master değişken tanımlanmamış.</p>
            <p className="text-sm">Master değişkenler raporlama, dashboard ve otomatik uyarılar için kullanılır.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {masterVars.map((variable) => {
              // Get status for this variable
              let statusInfo: MasterVariableStatusInfo | null = null;
              if (variable.masterType === 'endDate' && statuses?.endDate) {
                statusInfo = statuses.endDate;
              } else if (variable.masterType === 'terminationDeadline' && statuses?.terminationDeadline) {
                statusInfo = statuses.terminationDeadline;
              } else if (variable.masterType === 'renewalDate' && statuses?.renewalDate) {
                statusInfo = statuses.renewalDate;
              }

              const borderColor = statusInfo 
                ? statusInfo.borderColor 
                : 'border-gray-200/50 dark:border-[#324d67]/50';
              const bgColor = statusInfo 
                ? statusInfo.bgColor 
                : 'bg-gray-50/50 dark:bg-[#1f2e3d]';

              return (
                <div
                  key={variable._id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${borderColor} ${bgColor}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                        {getMasterTypeLabel(variable.masterType)}
                      </Badge>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {variable.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatValue(variable.value, variable.type)}
                    </p>
                    {statusInfo && (
                      <p className={`text-xs font-medium mt-1 ${statusInfo.textColor}`}>
                        {statusInfo.message}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => variable.masterType && handleRemoveMaster(variable.masterType!)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </Button>
                </div>
              );
            })}

            {/* Computed values */}
            {computed.terminationDeadline && (
              <div className="mt-4 p-3 rounded-lg border border-blue-200/50 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Hesaplanan Değerler
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Fesih İçin Son Tarih: {formatValue(computed.terminationDeadline, 'date')}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


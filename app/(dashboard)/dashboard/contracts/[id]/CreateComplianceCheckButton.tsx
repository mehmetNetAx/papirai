'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateComplianceCheckButtonProps {
  contractId: string;
  variables?: Array<{ _id: string; name: string; type: string; value: any }>;
}

export default function CreateComplianceCheckButton({ contractId, variables = [] }: CreateComplianceCheckButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [contractVariables, setContractVariables] = useState<Array<{ _id: string; name: string; type: string; value: any }>>(variables);
  const [formData, setFormData] = useState({
    variableId: '',
    expectedValue: '',
    actualValue: '',
    source: 'manual' as 'manual' | 'sap' | 'nebim' | 'logo' | 'netsis' | 'other_integration',
    description: '',
  });

  // Fetch variables if not provided
  useEffect(() => {
    if (contractVariables.length === 0) {
      fetchVariables();
    }
  }, []);

  const fetchVariables = async () => {
    try {
      const response = await fetch(`/api/variables?contractId=${contractId}`);
      if (response.ok) {
        const data = await response.json();
        setContractVariables(data.variables || []);
      }
    } catch (error) {
      console.error('Error fetching variables:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.variableId || !formData.expectedValue || !formData.actualValue) {
      alert('Lütfen tüm gerekli alanları doldurun.');
      return;
    }

    setIsCreating(true);

    try {
      // Parse values based on variable type
      const selectedVariable = contractVariables.find(v => v._id === formData.variableId);
      const variableType = selectedVariable?.type || 'text';

      let expectedValue: string | number | Date = formData.expectedValue;
      let actualValue: string | number | Date = formData.actualValue;

      if (variableType === 'number') {
        expectedValue = parseFloat(formData.expectedValue);
        actualValue = parseFloat(formData.actualValue);
        if (isNaN(expectedValue as number) || isNaN(actualValue as number)) {
          throw new Error('Beklenen ve gerçek değerler sayı olmalıdır.');
        }
      } else if (variableType === 'date') {
        expectedValue = new Date(formData.expectedValue);
        actualValue = new Date(formData.actualValue);
        if (isNaN(expectedValue.getTime()) || isNaN(actualValue.getTime())) {
          throw new Error('Geçerli tarih formatı giriniz.');
        }
      }

      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          variableId: formData.variableId,
          expectedValue,
          actualValue,
          source: formData.source,
          sourceData: formData.description ? { description: formData.description } : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
        throw new Error(errorData.error || 'Uyum kontrol kaydı oluşturulamadı');
      }

      const data = await response.json();
      
      alert(`✅ Başarılı!\n\nUyum kontrol kaydı oluşturuldu.\n\nSayfa yenilenecek...`);

      // Reset form
      setFormData({
        variableId: '',
        expectedValue: '',
        actualValue: '',
        source: 'manual',
        description: '',
      });
      setIsOpen(false);

      // Reload page after 1 second to show new compliance check
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error creating compliance check:', error);
      alert(`❌ Hata: ${error.message || 'Uyum kontrol kaydı oluşturulurken bir hata oluştu.'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedVariable = contractVariables.find(v => v._id === formData.variableId);
  const valueType = selectedVariable?.type || 'text';

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="text-sm"
      >
        <span className="material-symbols-outlined text-lg mr-2">add_alert</span>
        Uyum Kontrolü Oluştur
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Uyum Kontrolü Oluştur</DialogTitle>
            <DialogDescription>
              Sözleşme değişkeni için beklenen ve gerçek değerleri karşılaştırarak uyum kontrol kaydı oluşturun.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Variable Selection */}
              <div className="space-y-2">
                <Label htmlFor="variable">Değişken *</Label>
                <Select
                  value={formData.variableId}
                  onValueChange={(value) => {
                    const selectedVar = contractVariables.find(v => v._id === value);
                    let expectedValue = '';
                    
                    if (selectedVar) {
                      // Format the value based on type
                      if (selectedVar.type === 'date') {
                        // For date type, handle both Date objects and date strings
                        let date: Date;
                        if (selectedVar.value instanceof Date) {
                          date = new Date(selectedVar.value);
                        } else if (typeof selectedVar.value === 'string') {
                          date = new Date(selectedVar.value);
                        } else {
                          date = new Date();
                        }
                        // Format as YYYY-MM-DD for date input
                        if (!isNaN(date.getTime())) {
                          expectedValue = date.toISOString().split('T')[0];
                        }
                      } else if (selectedVar.type === 'number') {
                        // For number type, convert to string
                        expectedValue = String(selectedVar.value || '');
                      } else {
                        // For text and other types, convert to string
                        expectedValue = String(selectedVar.value || '');
                      }
                    }
                    
                    setFormData({ 
                      ...formData, 
                      variableId: value,
                      expectedValue: expectedValue,
                    });
                  }}
                >
                  <SelectTrigger id="variable">
                    <SelectValue placeholder="Değişken seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractVariables.length > 0 ? (
                      contractVariables.map((variable) => (
                        <SelectItem key={variable._id} value={variable._id}>
                          {variable.name} ({variable.type})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Değişken bulunamadı
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedVariable && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Mevcut değer: {selectedVariable.value instanceof Date 
                      ? new Date(selectedVariable.value).toLocaleDateString('tr-TR')
                      : String(selectedVariable.value || 'N/A')}
                  </p>
                )}
              </div>

              {/* Expected Value */}
              <div className="space-y-2">
                <Label htmlFor="expectedValue">
                  Beklenen Değer *
                  {valueType === 'number' && ' (Sayı)'}
                  {valueType === 'date' && ' (Tarih)'}
                </Label>
                <Input
                  id="expectedValue"
                  type={valueType === 'number' ? 'number' : valueType === 'date' ? 'date' : 'text'}
                  step={valueType === 'number' ? 'any' : undefined}
                  value={formData.expectedValue}
                  onChange={(e) => setFormData({ ...formData, expectedValue: e.target.value })}
                  placeholder={valueType === 'number' ? 'Örn: 2' : valueType === 'date' ? 'Tarih seçin' : 'Beklenen değer'}
                  required
                />
              </div>

              {/* Actual Value */}
              <div className="space-y-2">
                <Label htmlFor="actualValue">
                  Gerçek Değer *
                  {valueType === 'number' && ' (Sayı)'}
                  {valueType === 'date' && ' (Tarih)'}
                </Label>
                <Input
                  id="actualValue"
                  type={valueType === 'number' ? 'number' : valueType === 'date' ? 'date' : 'text'}
                  step={valueType === 'number' ? 'any' : undefined}
                  value={formData.actualValue}
                  onChange={(e) => setFormData({ ...formData, actualValue: e.target.value })}
                  placeholder={valueType === 'number' ? 'Örn: 3' : valueType === 'date' ? 'Tarih seçin' : 'Gerçek değer'}
                  required
                />
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label htmlFor="source">Kaynak *</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value: any) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger id="source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manuel</SelectItem>
                    <SelectItem value="sap">SAP</SelectItem>
                    <SelectItem value="nebim">Nebim</SelectItem>
                    <SelectItem value="logo">Logo</SelectItem>
                    <SelectItem value="netsis">Netsis</SelectItem>
                    <SelectItem value="other_integration">Diğer Entegrasyon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
                <Input
                  id="description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Uyum kontrolü hakkında notlar..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isCreating}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isCreating || !formData.variableId || !formData.expectedValue || !formData.actualValue}>
                {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}


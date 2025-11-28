'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface NewIntegrationFormProps {
  companies: Array<{ _id: string; name: string; type: string }>;
  defaultCompanyId: string;
  currentUserRole: string;
}

export default function NewIntegrationForm({
  companies,
  defaultCompanyId,
  currentUserRole,
}: NewIntegrationFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'sap' as 'sap' | 'nebim' | 'logo' | 'netsis' | 'custom',
    companyId: defaultCompanyId,
    isActive: true,
    config: {
      apiEndpoint: '',
      apiKey: '',
      username: '',
      password: '',
      database: '',
      port: 0,
    },
    mapping: {
      variableMappings: {} as Record<string, string>,
    },
    schedule: {
      enabled: false,
      frequency: 'daily' as 'hourly' | 'daily' | 'weekly' | 'monthly',
      time: '09:00',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          companyId: formData.companyId,
          isActive: formData.isActive,
          config: {
            ...(formData.config.apiEndpoint && { apiEndpoint: formData.config.apiEndpoint }),
            ...(formData.config.apiKey && { apiKey: formData.config.apiKey }),
            ...(formData.config.username && { username: formData.config.username }),
            ...(formData.config.password && { password: formData.config.password }),
            ...(formData.config.database && { database: formData.config.database }),
            ...(formData.config.port && formData.config.port > 0 && { port: formData.config.port }),
          },
          mapping: formData.mapping,
          schedule: formData.schedule,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Entegrasyon oluşturulurken bir hata oluştu');
      }

      const data = await response.json();
      router.push(`/dashboard/integrations/${data.integration._id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Entegrasyon oluşturulurken bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const integrationTypes = [
    { value: 'sap', label: 'SAP' },
    { value: 'nebim', label: 'Nebim' },
    { value: 'logo', label: 'Logo' },
    { value: 'netsis', label: 'Netsis' },
    { value: 'custom', label: 'Özel' },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard/integrations">
                <Button variant="ghost" size="sm">
                  <span className="material-symbols-outlined text-lg mr-2">arrow_back</span>
                  Geri
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Yeni Entegrasyon</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ERP sistemi entegrasyonu oluşturun
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Entegrasyon Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Entegrasyon Adı</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: SAP Production"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Entegrasyon Tipi</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {integrationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentUserRole === 'system_admin' && companies.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="companyId">Şirket</Label>
                  <Select
                    value={formData.companyId}
                    onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company._id} value={company._id}>
                          {company.name} ({company.type === 'group' ? 'Grup' : 'Yan Kuruluş'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Aktif
                </Label>
              </div>

              {/* Configuration */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bağlantı Ayarları</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiEndpoint">API Endpoint / URL</Label>
                    <Input
                      id="apiEndpoint"
                      value={formData.config.apiEndpoint}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, apiEndpoint: e.target.value },
                        })
                      }
                      placeholder="https://api.example.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Kullanıcı Adı</Label>
                      <Input
                        id="username"
                        value={formData.config.username}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            config: { ...formData.config, username: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Şifre</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.config.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            config: { ...formData.config, password: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key (Opsiyonel)</Label>
                      <Input
                        id="apiKey"
                        value={formData.config.apiKey}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            config: { ...formData.config, apiKey: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="database">Veritabanı Adı</Label>
                      <Input
                        id="database"
                        value={formData.config.database}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            config: { ...formData.config, database: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zamanlama</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="scheduleEnabled"
                      checked={formData.schedule.enabled}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          schedule: { ...formData.schedule, enabled: checked },
                        })
                      }
                    />
                    <Label htmlFor="scheduleEnabled" className="cursor-pointer">
                      Otomatik Compliance Kontrolü
                    </Label>
                  </div>

                  {formData.schedule.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="frequency">Sıklık</Label>
                        <Select
                          value={formData.schedule.frequency}
                          onValueChange={(value: any) =>
                            setFormData({
                              ...formData,
                              schedule: { ...formData.schedule, frequency: value },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Saatlik</SelectItem>
                            <SelectItem value="daily">Günlük</SelectItem>
                            <SelectItem value="weekly">Haftalık</SelectItem>
                            <SelectItem value="monthly">Aylık</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Saat (HH:mm)</Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.schedule.time}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              schedule: { ...formData.schedule, time: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/integrations">İptal</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Oluşturuluyor...' : 'Oluştur'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}


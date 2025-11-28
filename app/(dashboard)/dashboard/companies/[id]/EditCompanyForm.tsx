'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

interface Company {
  _id: string;
  name: string;
  type: 'group' | 'subsidiary';
  parentCompanyId?: string;
  settings?: {
    allowSelfRegistration?: boolean;
    defaultWorkspacePermissions?: Record<string, any>;
    notificationPreferences?: Record<string, any>;
  };
  isActive: boolean;
}

interface EditCompanyFormProps {
  company: Company;
}

export default function EditCompanyForm({ company }: EditCompanyFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: company.name || '',
    allowSelfRegistration: company.settings?.allowSelfRegistration || false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allowSelfRegistration: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Şirket adı gereklidir.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/companies/${company._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          settings: {
            allowSelfRegistration: formData.allowSelfRegistration,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Şirket güncelleme işlemi başarısız oldu.');
        return;
      }

      // Success, redirect to company detail page
      router.push(`/dashboard/companies/${company._id}`);
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href={`/dashboard/companies/${company._id}`}
                className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                Şirketi Düzenle
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{company.name}</p>
          </div>
        </div>

        <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
              Şirket Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Şirket Adı *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                />
              </div>

              {/* Company Type (Read-only) */}
              <div className="space-y-2">
                <Label>Şirket Tipi</Label>
                <Input
                  value={company.type === 'group' ? 'Grup Şirketi' : 'Alt Şirket'}
                  disabled
                  readOnly
                  className="bg-gray-100 dark:bg-gray-100 text-gray-600 dark:text-gray-600"
                />
              </div>

              {/* Settings */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ayarlar</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowSelfRegistration">Kendi Kendine Kayıt</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Kullanıcıların kendi kendilerine kayıt olmasına izin ver
                    </p>
                  </div>
                  <Switch
                    id="allowSelfRegistration"
                    checked={formData.allowSelfRegistration}
                    onCheckedChange={handleSwitchChange}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-row-reverse items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link href={`/dashboard/companies/${company._id}`}>İptal</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

interface LoggingSettings {
  globalEnabled: boolean;
  globalLogLevels: string[];
  globalActivityTypes: string[];
  retentionDays: number;
  autoCleanupEnabled: boolean;
  autoCleanupSchedule: string;
  maxLogsPerUser: number;
  logIpAddress: boolean;
  logUserAgent: boolean;
  logRequestDetails: boolean;
  userSettings: Record<string, any>;
}

export default function LoggingSettingsClient() {
  const [settings, setSettings] = useState<LoggingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/logging/settings');
      if (!response.ok) throw new Error('Failed to load settings');
      const data = await response.json();
      
      // Ensure all required fields have default values
      setSettings({
        globalEnabled: data.globalEnabled ?? false,
        globalLogLevels: Array.isArray(data.globalLogLevels) ? data.globalLogLevels : ['info', 'warning', 'error'],
        globalActivityTypes: Array.isArray(data.globalActivityTypes) ? data.globalActivityTypes : ['login', 'logout', 'error', 'data_modification'],
        retentionDays: data.retentionDays ?? 90,
        autoCleanupEnabled: data.autoCleanupEnabled ?? false,
        autoCleanupSchedule: data.autoCleanupSchedule ?? '0 2 * * *',
        maxLogsPerUser: data.maxLogsPerUser ?? 10000,
        logIpAddress: data.logIpAddress ?? true,
        logUserAgent: data.logUserAgent ?? true,
        logRequestDetails: data.logRequestDetails ?? true,
        userSettings: data.userSettings ?? {},
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      alert('Ayarlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/logging/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      alert('Ayarlar başarıyla kaydedildi.');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('Hata: ' + (error.message || 'Ayarlar kaydedilirken bir hata oluştu.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleLogLevel = (level: string) => {
    if (!settings) return;
    const currentLevels = Array.isArray(settings.globalLogLevels) ? settings.globalLogLevels : [];
    const newLevels = currentLevels.includes(level)
      ? currentLevels.filter(l => l !== level)
      : [...currentLevels, level];
    setSettings({ ...settings, globalLogLevels: newLevels });
  };

  const toggleActivityType = (type: string) => {
    if (!settings) return;
    const currentTypes = Array.isArray(settings.globalActivityTypes) ? settings.globalActivityTypes : [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    setSettings({ ...settings, globalActivityTypes: newTypes });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <p>Ayarlar yüklenemedi.</p>
        </div>
      </div>
    );
  }

  const activityTypes = [
    'login',
    'logout',
    'page_view',
    'navigation',
    'api_call',
    'error',
    'warning',
    'data_access',
    'data_modification',
    'export',
    'search',
    'filter',
  ];

  const logLevels = ['info', 'warning', 'error', 'debug'];

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Loglama Ayarları</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sistem geneli ve kullanıcı bazlı loglama ayarlarını yönetin
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost">Geri</Button>
          </Link>
        </div>

        {/* Global Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Genel Ayarlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="globalEnabled" className="text-base font-medium">
                  Loglama Etkin
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Sistem genelinde loglama özelliğini aç/kapat
                </p>
              </div>
              <Switch
                id="globalEnabled"
                checked={settings.globalEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, globalEnabled: checked })
                }
              />
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Log Seviyeleri</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {logLevels.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={`level-${level}`}
                      checked={Array.isArray(settings.globalLogLevels) && settings.globalLogLevels.includes(level)}
                      onCheckedChange={() => toggleLogLevel(level)}
                    />
                    <Label htmlFor={`level-${level}`} className="cursor-pointer capitalize">
                      {level}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Aktivite Tipleri</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {activityTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={Array.isArray(settings.globalActivityTypes) && settings.globalActivityTypes.includes(type)}
                      onCheckedChange={() => toggleActivityType(type)}
                    />
                    <Label htmlFor={`type-${type}`} className="cursor-pointer">
                      {type.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retention Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Saklama Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoCleanupEnabled" className="text-base font-medium">
                  Otomatik Temizlik
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Eski logları otomatik olarak sil
                </p>
              </div>
              <Switch
                id="autoCleanupEnabled"
                checked={settings.autoCleanupEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoCleanupEnabled: checked })
                }
              />
            </div>

            <div>
              <Label htmlFor="retentionDays">Saklama Süresi (Gün)</Label>
              <Input
                id="retentionDays"
                type="number"
                min="0"
                value={settings.retentionDays}
                onChange={(e) =>
                  setSettings({ ...settings, retentionDays: parseInt(e.target.value) || 0 })
                }
                className="mt-2"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                0 = süresiz sakla
              </p>
            </div>

            <div>
              <Label htmlFor="maxLogsPerUser">Kullanıcı Başına Maksimum Log Sayısı</Label>
              <Input
                id="maxLogsPerUser"
                type="number"
                min="0"
                value={settings.maxLogsPerUser}
                onChange={(e) =>
                  setSettings({ ...settings, maxLogsPerUser: parseInt(e.target.value) || 0 })
                }
                className="mt-2"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                0 = sınırsız
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gizlilik Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="logIpAddress" className="text-base font-medium">
                  IP Adresi Logla
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Kullanıcı IP adreslerini logla
                </p>
              </div>
              <Switch
                id="logIpAddress"
                checked={settings.logIpAddress}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, logIpAddress: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="logUserAgent" className="text-base font-medium">
                  User Agent Logla
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Tarayıcı bilgilerini logla
                </p>
              </div>
              <Switch
                id="logUserAgent"
                checked={settings.logUserAgent}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, logUserAgent: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="logRequestDetails" className="text-base font-medium">
                  İstek Detaylarını Logla
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  HTTP istek detaylarını logla
                </p>
              </div>
              <Switch
                id="logRequestDetails"
                checked={settings.logRequestDetails}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, logRequestDetails: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </Button>
        </div>
      </div>
    </div>
  );
}



'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MailSettings {
  configured: boolean;
  connectionStatus: 'not_configured' | 'connected' | 'error';
  connectionError?: string;
  settings: {
    host: string;
    port: string;
    user: string;
    from: string;
  };
}

export default function MailSettingsClient() {
  const [settings, setSettings] = useState<MailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/mail');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load mail settings:', error);
      setMessage({ type: 'error', text: 'Mail ayarları yüklenirken bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Lütfen test e-posta adresini girin.' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/mail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Test e-postası başarıyla gönderildi!' });
        setTestEmail('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Test e-postası gönderilemedi.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Test e-postası gönderilirken bir hata oluştu.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (!settings) return 'bg-gray-500';
    switch (settings.connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusText = () => {
    if (!settings) return 'Bilinmiyor';
    switch (settings.connectionStatus) {
      case 'connected':
        return 'Bağlantı Başarılı';
      case 'error':
        return 'Bağlantı Hatası';
      case 'not_configured':
        return 'Yapılandırılmamış';
      default:
        return 'Bilinmiyor';
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">
            Mail Ayarları
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
            SMTP mail gönderim ayarlarını kontrol edin ve test edin
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6 border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
              Bağlantı Durumu: {getStatusText()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settings?.connectionError && (
              <Alert className="mb-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <AlertDescription className="text-red-600 dark:text-red-400">
                  <strong>Hata:</strong> {settings.connectionError}
                </AlertDescription>
              </Alert>
            )}
            {settings?.configured ? (
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong>Durum:</strong> Mail ayarları yapılandırılmış
                </p>
                <p>
                  <strong>SMTP Host:</strong> {settings.settings.host || 'Belirtilmemiş'}
                </p>
                <p>
                  <strong>SMTP Port:</strong> {settings.settings.port || 'Belirtilmemiş'}
                </p>
                <p>
                  <strong>SMTP Kullanıcı:</strong> {settings.settings.user || 'Belirtilmemiş'}
                </p>
                <p>
                  <strong>Gönderen Adres:</strong> {settings.settings.from || 'Belirtilmemiş'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    <strong>Uyarı:</strong> Mail ayarları yapılandırılmamış. Lütfen aşağıdaki ortam değişkenlerini ayarlayın:
                  </AlertDescription>
                </Alert>
                <div className="bg-gray-50 dark:bg-[#1a2533] p-4 rounded-lg font-mono text-sm space-y-2">
                  <div><code className="text-blue-600 dark:text-blue-400">SMTP_HOST</code> - SMTP sunucu adresi</div>
                  <div><code className="text-blue-600 dark:text-blue-400">SMTP_PORT</code> - SMTP port (örn: 587)</div>
                  <div><code className="text-blue-600 dark:text-blue-400">SMTP_USER</code> - SMTP kullanıcı adı</div>
                  <div><code className="text-blue-600 dark:text-blue-400">SMTP_PASSWORD</code> - SMTP şifresi</div>
                  <div><code className="text-blue-600 dark:text-blue-400">SMTP_FROM</code> - Gönderen e-posta adresi (opsiyonel)</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bu ayarları Vercel, .env dosyası veya sunucu ortam değişkenlerinde yapılandırabilirsiniz.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Email Card */}
        {settings?.configured && (
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Test E-postası Gönder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && (
                <Alert className={message.type === 'success' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}>
                  <AlertDescription className={message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="test-email">Test E-posta Adresi</Label>
                <div className="flex gap-2">
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleTestEmail}
                    disabled={testing || !testEmail}
                    className="button button-egg-blue"
                  >
                    {testing ? 'Gönderiliyor...' : 'Test Gönder'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mail ayarlarınızı test etmek için bir test e-postası gönderin
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gmail Setup Guide */}
        <Card className="mt-6 border border-green-200/80 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">📧 Gmail SMTP Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-green-800 dark:text-green-200">
              <p className="font-semibold">Gmail kullanmak için aşağıdaki adımları izleyin:</p>
              
              <div className="bg-white dark:bg-[#1a2533] p-4 rounded-lg space-y-3">
                <div>
                  <p className="font-semibold mb-2">1. Gmail App Password Oluşturma:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Google Hesabınıza giriş yapın</li>
                    <li><a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google Hesap Güvenliği</a> sayfasına gidin</li>
                    <li>"2 Adımlı Doğrulama"nın açık olduğundan emin olun (gerekirse açın)</li>
                    <li>"Uygulama şifreleri" bölümüne gidin</li>
                    <li>"Uygulama seçin" → "Mail" seçin</li>
                    <li>"Cihaz seçin" → "Diğer (Özel ad)" → "PapirAi" yazın</li>
                    <li>"Oluştur" butonuna tıklayın</li>
                    <li>Oluşturulan 16 haneli şifreyi kopyalayın (boşluksuz)</li>
                  </ol>
                </div>

                <div>
                  <p className="font-semibold mb-2">2. Ortam Değişkenlerini Ayarlayın:</p>
                  <div className="bg-gray-50 dark:bg-[#111a22] p-3 rounded font-mono text-xs space-y-1">
                    <div><code className="text-blue-600 dark:text-blue-400">SMTP_HOST</code>=<code className="text-green-600 dark:text-green-400">smtp.gmail.com</code></div>
                    <div><code className="text-blue-600 dark:text-blue-400">SMTP_PORT</code>=<code className="text-green-600 dark:text-green-400">587</code></div>
                    <div><code className="text-blue-600 dark:text-blue-400">SMTP_USER</code>=<code className="text-green-600 dark:text-green-400">your-email@gmail.com</code></div>
                    <div><code className="text-blue-600 dark:text-blue-400">SMTP_PASSWORD</code>=<code className="text-green-600 dark:text-green-400">your-app-password</code> (16 haneli App Password)</div>
                    <div><code className="text-blue-600 dark:text-blue-400">SMTP_FROM</code>=<code className="text-green-600 dark:text-green-400">your-email@gmail.com</code> (opsiyonel)</div>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">3. Önemli Notlar:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Gmail normal şifrenizi kullanmayın, mutlaka App Password kullanın</li>
                    <li>App Password 16 haneli, boşluksuz bir şifredir</li>
                    <li>2 Adımlı Doğrulama açık olmalıdır</li>
                    <li>Port 587 (TLS) kullanılmalıdır</li>
                    <li>Ayarları değiştirdikten sonra uygulamayı yeniden başlatın</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-300 dark:border-yellow-700">
                <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">⚠️ Güvenlik Uyarısı:</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  App Password'u güvenli bir yerde saklayın ve asla paylaşmayın. Eğer şifrenin sızdığını düşünüyorsanız, Google Hesap Güvenliği sayfasından App Password'u iptal edip yeni bir tane oluşturun.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border border-blue-200/80 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 shadow-sm rounded-xl">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p><strong>Not:</strong> Mail ayarları ortam değişkenleri üzerinden yönetilir.</p>
              <p>Şifre sıfırlama ve bildirim e-postaları bu ayarlar kullanılarak gönderilir.</p>
              <p>Ayarları değiştirdikten sonra uygulamayı yeniden başlatmanız gerekebilir.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


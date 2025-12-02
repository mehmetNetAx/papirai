'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function InviteUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'contract_manager' | 'legal_reviewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Lütfen e-posta adresini girin.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Davet gönderilemedi.');
        return;
      }

      setSuccess(true);
      setEmail('');
      setTimeout(() => {
        router.push('/dashboard/users');
      }, 2000);
    } catch (err: any) {
      console.error('[InviteUser] Unexpected error:', err);
      setError(err?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">
            Kullanıcı Davet Et
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
            Yeni bir kullanıcıyı platforma davet edin
          </p>
        </div>

        <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle>Davet Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <AlertDescription className="text-red-600 dark:text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <AlertDescription className="text-green-600 dark:text-green-400">
                  Davet başarıyla gönderildi! Kullanıcılar sayfasına yönlendiriliyorsunuz...
                </AlertDescription>
              </Alert>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta Adresi</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="kullanici@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Davet e-postası bu adrese gönderilecek
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={role} onValueChange={(value: any) => setRole(value)} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Rol seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Görüntüleyici</SelectItem>
                      <SelectItem value="contract_manager">Sözleşme Yöneticisi</SelectItem>
                      <SelectItem value="legal_reviewer">Hukuk İnceleyici</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Davet edilen kullanıcı bu rol ile sisteme dahil olacak
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="button button-egg-blue"
                  >
                    {loading ? 'Gönderiliyor...' : 'Davet Gönder'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    İptal
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border border-blue-200/80 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 shadow-sm rounded-xl">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p><strong>Not:</strong> Davet edilen kullanıcı e-postasındaki bağlantıya tıklayarak hesabını oluşturabilir.</p>
              <p>Davet 7 gün geçerlidir. Kullanıcı daveti kabul ettiğinde görüntüleyici rolü ile sisteme dahil olacaktır.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


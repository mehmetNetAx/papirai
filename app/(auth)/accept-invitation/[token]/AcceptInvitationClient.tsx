'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InvitationDetails {
  valid: boolean;
  email?: string;
  role?: string;
  companyName?: string;
  contractTitle?: string | null;
  invitedByName?: string;
  expiresAt?: string;
  error?: string;
}

export default function AcceptInvitationClient({ token }: { token: string }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${token}/accept`);
        const data = await response.json();
        setInvitation(data);
        if (data.email) {
          setName(data.email.split('@')[0]); // Pre-fill name with email username
        }
      } catch (error) {
        console.error('Failed to load invitation:', error);
        setInvitation({ valid: false, error: 'Davet bilgileri yüklenirken bir hata oluştu.' });
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name || !password || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Davet kabul edilemedi.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?invitationAccepted=true');
      }, 2000);
    } catch (err: any) {
      console.error('[AcceptInvitation] Unexpected error:', err);
      setError(err?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-wrapper auth-v2 min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation?.valid) {
    return (
      <div className="auth-wrapper auth-v2 min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
        <div className="row auth-inner m-0 w-full flex-1 flex flex-col">
          <div className="w-full flex justify-center items-center py-4 px-4 lg:px-8">
            <div className="brand-logo flex items-center justify-center gap-1">
              <Image
                src="/logo.svg"
                alt="PapirAi Logo"
                width={400}
                height={400}
                className="h-6 w-auto"
                priority
              />
            </div>
          </div>
          <div className="flex items-center justify-center auth-bg px-2 py-5 lg:py-5">
            <Card className="w-full max-w-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <CardContent className="pt-6">
                <Alert className="border-red-200 dark:border-red-800">
                  <AlertDescription className="text-red-600 dark:text-red-400">
                    <strong>Geçersiz Davet</strong>
                    <p className="mt-2">{invitation?.error || 'Bu davet geçersiz veya süresi dolmuş.'}</p>
                  </AlertDescription>
                </Alert>
                <div className="mt-4 text-center">
                  <Link href="/login" className="text-primary hover:underline">
                    Giriş sayfasına dön
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper auth-v2 min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <div className="row auth-inner m-0 w-full flex-1 flex flex-col">
        {/* Logo Section */}
        <div className="w-full flex justify-center items-center py-4 px-4 lg:px-8">
          <div className="brand-logo flex items-center justify-center gap-1">
            <Image
              src="/logo.svg"
              alt="PapirAi Logo"
              width={400}
              height={400}
              className="h-6 w-auto"
              priority
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center justify-center auth-bg px-2 py-5 lg:py-5">
          <Card className="w-full max-w-md border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white font-display">
                Daveti Kabul Et 🎉
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {invitation.contractTitle 
                  ? `${invitation.invitedByName} sizi "${invitation.contractTitle}" sözleşmesine davet etti.`
                  : `${invitation.invitedByName} sizi PapirAi platformuna davet etti.`
                }
              </p>
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
                    Hesabınız başarıyla oluşturuldu! Giriş sayfasına yönlendiriliyorsunuz...
                  </AlertDescription>
                </Alert>
              )}

              {!success && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      value={invitation.email}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Adınız ve soyadınız"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Şifre"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={submitting}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14px"
                          height="14px"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {showPassword ? (
                            <>
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </>
                          ) : (
                            <>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Şifre Tekrarı</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Şifre tekrarı"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={submitting}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14px"
                          height="14px"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {showConfirmPassword ? (
                            <>
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </>
                          ) : (
                            <>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full button button-egg-blue"
                  >
                    {submitting ? 'Hesap oluşturuluyor...' : 'Daveti Kabul Et ve Hesap Oluştur'}
                  </Button>
                </form>
              )}

              <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                <Link href="/login" className="text-primary hover:underline">
                  Zaten hesabınız var mı? Giriş yapın
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


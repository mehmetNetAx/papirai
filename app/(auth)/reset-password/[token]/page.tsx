'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/brand/Logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Validate token on mount
    const validateToken = async () => {
      if (!token) {
        setValidating(false);
        setTokenValid(false);
        setError('Geçersiz şifre sıfırlama bağlantısı.');
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setError(data.error || 'Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı.');
        }
      } catch (err: any) {
        console.error('[ResetPassword] Token validation error:', err);
        setTokenValid(false);
        setError('Token doğrulama sırasında bir hata oluştu.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Şifre sıfırlama işlemi başarısız oldu.');
        return;
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        router.push('/login?passwordReset=true');
      }, 2000);
    } catch (err: any) {
      console.error('[ResetPassword] Unexpected error:', err);
      setError(err?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper auth-v2 min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <div className="row auth-inner m-0 w-full flex-1 flex flex-col">
        {/* Logo Section - Top */}
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
            <h2 className="brand-text text-xl font-semibold text-gray-900 dark:text-white font-display">
              
            </h2>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row w-full flex-1">
          {/* Left Column - SVG Image (hidden on mobile, visible on lg+) */}
          <div className="hidden lg:flex items-center justify-center p-5 lg:w-7/12">
            <div className="w-full flex items-center justify-center px-5">
              <Image
                src="/login-v2.72cd8a26.svg"
                alt="Reset Password"
                width={747}
                height={547}
                className="img-fluid max-w-full h-auto"
                priority
              />
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="flex items-center justify-center auth-bg px-2 py-5 lg:py-5 lg:w-5/12">
            <div className="px-xl-2 mx-auto col-sm-8 col-md-6 col-lg-12 w-full max-w-md">
              <h2 className="card-title mb-1 font-weight-bold text-2xl font-bold text-gray-900 dark:text-white font-display">
                Yeni Şifre Belirle 🔐
              </h2>
              <p className="card-text mb-2 text-gray-600 dark:text-gray-400">
                Yeni şifrenizi belirleyin
              </p>

              {validating && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Bağlantı doğrulanıyor...
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Şifreniz başarıyla sıfırlandı! Giriş sayfasına yönlendiriliyorsunuz...
                  </p>
                </div>
              )}

              {!validating && tokenValid && !success && (
                <form className="auth-login-form mt-2" onSubmit={handleSubmit}>
                  {/* New Password Input */}
                  <div className="form-group mb-4">
                    <label htmlFor="reset-new-password" className="d-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Yeni Şifre
                    </label>
                    <div className="relative">
                      <div className="input-group input-group-merge flex items-stretch">
                        <input
                          id="reset-new-password"
                          name="reset-new-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Yeni şifre"
                          autoComplete="new-password"
                          className="form-control-merge form-control w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#92adc9] focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          disabled={loading}
                        />
                        <div className="input-group-append absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="input-group-text bg-transparent border-0 p-0">
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="cursor-pointer text-gray-400 dark:text-[#92adc9] hover:text-gray-600 dark:hover:text-white"
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
                      </div>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="form-group mb-4">
                    <label htmlFor="reset-confirm-password" className="d-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Yeni Şifre Tekrarı
                    </label>
                    <div className="relative">
                      <div className="input-group input-group-merge flex items-stretch">
                        <input
                          id="reset-confirm-password"
                          name="reset-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Yeni şifre tekrarı"
                          autoComplete="new-password"
                          className="form-control-merge form-control w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#92adc9] focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={loading}
                        />
                        <div className="input-group-append absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="input-group-text bg-transparent border-0 p-0">
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="cursor-pointer text-gray-400 dark:text-[#92adc9] hover:text-gray-600 dark:hover:text-white"
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
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="w-100 flex justify-end">
                    <button
                      type="submit"
                      className="btn elevated-btn px-3 btn-primary button button-egg-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      <span>{loading ? 'Şifre sıfırlanıyor...' : 'Şifreyi Sıfırla'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Login Link */}
              <p className="card-text text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Şifrenizi hatırladınız mı?</span>{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  <span>Giriş ekranına dön</span>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



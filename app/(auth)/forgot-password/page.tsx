'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/brand/Logo';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!email) {
      setError('Lütfen e-posta adresinizi girin.');
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
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || 'Şifre sıfırlama talebi gönderilemedi.';
        
        // If mail settings not configured, show helpful message
        if (data.mailSettingsNotConfigured || data.mailError) {
          errorMessage = data.error || 'Mail ayarları yapılandırılmamış veya hatalı. Lütfen sistem yöneticisine başvurun.';
        }
        
        setError(errorMessage);
        return;
      }

      // Success - always show success message for security
      setSuccess(true);
    } catch (err: any) {
      console.error('[ForgotPassword] Unexpected error:', err);
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
                alt="Forgot Password"
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
                Şifremi Unuttum 🔐
              </h2>
              <p className="card-text mb-2 text-gray-600 dark:text-gray-400">
                E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                    <strong>E-posta gönderildi!</strong>
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi. 
                    Lütfen e-posta kutunuzu kontrol edin ve gelen bağlantıya tıklayarak şifrenizi sıfırlayın.
                  </p>
                  <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-2">
                    E-postayı görmüyorsanız spam klasörünüzü kontrol etmeyi unutmayın.
                  </p>
                </div>
              )}

              {!success && (
                <form className="auth-login-form mt-2" onSubmit={handleSubmit}>
                  {/* Email Input */}
                  <div className="form-group mb-4">
                    <label htmlFor="forgot-email" className="d-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      E-posta Adresi
                    </label>
                    <div>
                      <input
                        id="forgot-email"
                        name="forgot-email"
                        type="email"
                        placeholder="john@example.com"
                        autoComplete="email"
                        className="form-control w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#92adc9] focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="w-100 flex justify-end">
                    <button
                      type="submit"
                      className="btn elevated-btn px-3 btn-primary button button-egg-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      <span>{loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}</span>
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


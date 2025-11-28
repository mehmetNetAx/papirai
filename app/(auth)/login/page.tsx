'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/brand/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth error codes
        let errorMessage = 'Geçersiz e-posta veya şifre';
        
        if (result.error === 'CredentialsSignin') {
          errorMessage = 'E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
        } else if (result.error.includes('database') || result.error.includes('connection')) {
          errorMessage = 'Veritabanı bağlantı hatası. Lütfen daha sonra tekrar deneyin veya yöneticiye başvurun.';
        } else if (result.error.includes('configuration')) {
          errorMessage = 'Sistem yapılandırma hatası. Lütfen yöneticiye başvurun.';
        } else {
          // Show the actual error message if available
          errorMessage = result.error || 'Giriş yapılamadı. Lütfen tekrar deneyin.';
        }
        
        console.error('[Login] Sign in error:', result.error);
        console.error('[Login] Full result:', result);
        setError(errorMessage);
      } else if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError('Giriş yapılamadı. Lütfen tekrar deneyin.');
      }
    } catch (err: any) {
      console.error('[Login] Unexpected error:', err);
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
                alt="Login V2"
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
                Hoşgeldin! 👋
              </h2>
              <p className="card-text mb-2 text-gray-600 dark:text-gray-400">
                Hesabınızla giriş yapın ve dokümanlarınızı dijitalleştirin
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-color-accent/10 dark:bg-color-accent/20 border border-color-accent/30">
                  <p className="text-sm text-color-accent">{error}</p>
                </div>
              )}

              <form className="auth-login-form mt-2" onSubmit={handleSubmit}>
                {/* Email/Username Input */}
                <div className="form-group mb-4">
                  <label htmlFor="login-email" className="d-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kullanıcı adı
                  </label>
                  <div>
                    <input
                      id="login-email"
                      name="login-email"
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

                {/* Password Input */}
                <fieldset className="form-group mb-4">
                  <div>
                    <div className="d-flex justify-content-between mb-2">
                      <label htmlFor="login-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Parola
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-primary hover:underline"
                      >
                        <small>Şifreni mi unuttun?</small>
                      </Link>
                    </div>
                    <div className="relative">
                      <div className="input-group input-group-merge flex items-stretch">
                        <input
                          id="login-password"
                          name="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Parola"
                          autoComplete="current-password"
                          className="form-control-merge form-control w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#92adc9] focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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
                </fieldset>

                {/* Remember Me Checkbox */}
                <fieldset className="form-group mb-4">
                  <div>
                    <div className="custom-control custom-checkbox flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        name="remember-me"
                        className="custom-control-input w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading}
                      />
                      <label htmlFor="remember-me" className="custom-control-label ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Beni hatırla
                      </label>
                    </div>
                  </div>
                </fieldset>

                {/* Submit Button */}
                <div className="w-100 flex justify-end">
                  <button
                    type="submit"
                    className="btn elevated-btn px-3 btn-primary button button-egg-blue disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    <span>{loading ? 'Giriş yapılıyor...' : 'Giriş yap'}</span>
                  </button>
                </div>
              </form>

              {/* Sign Up Link */}
              <p className="card-text text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Platforma ilk defa mı geliyorsunuz?</span>{' '}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  <span>Yeni hesap oluştur</span>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

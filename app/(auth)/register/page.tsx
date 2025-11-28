'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/brand/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.acceptTerms) {
      setError('Hizmet Şartları\'nı kabul etmelisiniz.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Kayıt işlemi başarısız oldu.');
        return;
      }

      // Registration successful, redirect to login
      router.push('/login?registered=true');
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
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
              width={250}
              height={250}
              className="h-6 w-auto"
              priority
            />
            
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row w-full flex-1">
          {/* Left Column - SVG Image (hidden on mobile, visible on lg+) */}
          <div className="hidden lg:flex items-center justify-center p-5 lg:w-7/12">
            <div className="w-full flex items-center justify-center px-5">
              <Image
                src="/register-v2.0a9e487c.svg"
                alt="Register V2"
                width={728}
                height={591}
                className="img-fluid max-w-full h-auto"
                priority
              />
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="flex items-center justify-center auth-bg px-2 py-5 lg:py-5 lg:w-5/12">
            <div className="px-xl-2 mx-auto col-sm-8 col-md-6 col-lg-12 w-full max-w-md">
              <h4 className="card-title mb-1 text-2xl font-bold text-gray-900 dark:text-white font-display">
                Kaydol 🚀
              </h4>
              <p className="card-text mb-2 text-gray-600 dark:text-gray-400">
                papir.ai'a kaydol, gerisini bize bırak
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-color-accent/10 dark:bg-color-accent/20 border border-color-accent/30">
                  <p className="text-sm text-color-accent">{error}</p>
                </div>
              )}

              <form className="auth-register-form mt-2" onSubmit={handleSubmit}>
                {/* First Name */}
                <div className="form-group mb-4">
                  <label htmlFor="register-username" className="d-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kullanıcı adı
                  </label>
                  <div>
                    <input
                      id="register-username"
                      name="firstName"
                      type="text"
                      placeholder="Ad"
                      className="form-control w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#92adc9] focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div className="form-group mb-4">
                  <label htmlFor="register-lastname" className="d-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Soyadı
                  </label>
                  <div>
                    <input
                      id="register-lastname"
                      name="lastName"
                      type="text"
                      placeholder="Soyad"
                      className="form-control w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#92adc9] focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="form-group mb-4">
                  <label htmlFor="register-email" className="d-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    E-posta
                  </label>
                  <div>
                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      className="form-control w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#92adc9] focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="form-group mb-4">
                  <label htmlFor="register-password" className="d-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Şifre
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Şifre"
                      className="form-control w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#92adc9] focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-[#92adc9] hover:text-gray-600 dark:hover:text-white"
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

                {/* Confirm Password */}
                <div className="form-group mb-4">
                  <label htmlFor="register-confirm-password" className="d-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Şifre Tekrarı
                  </label>
                  <div className="relative">
                    <input
                      id="register-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Şifre Tekrarı"
                      className="form-control w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#92adc9] focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-[#92adc9] hover:text-gray-600 dark:hover:text-white"
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

                {/* Privacy Policy Checkbox */}
                <fieldset className="form-group mb-4">
                  <div>
                    <div className="custom-control custom-checkbox flex items-center">
                      <input
                        id="register-privacy-policy"
                        type="checkbox"
                        name="acceptTerms"
                        className="custom-control-input w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        checked={formData.acceptTerms}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                      <label htmlFor="register-privacy-policy" className="custom-control-label ml-2 text-sm text-gray-700 dark:text-gray-300">
                        <Link href="#" className="text-primary hover:underline font-medium">
                          Gizlilik politikası ve şartları
                        </Link>{' '}
                        okudum ve kabul ediyorum
                      </label>
                    </div>
                  </div>
                </fieldset>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary btn-block button button-egg-blue w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <span>{loading ? 'Hesap oluşturuluyor...' : 'Kayıt ol'}</span>
                </button>
              </form>

              {/* Login Link */}
              <p className="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Zaten bir hesabın var mı?</span>{' '}
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

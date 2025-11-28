'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GroupCompany {
  _id: string;
  name: string;
}

export default function NewCompanyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    taxNumber: '',
    country: '',
    type: 'subsidiary' as 'group' | 'subsidiary',
    parentCompanyId: '',
  });
  const [groupCompanies, setGroupCompanies] = useState<GroupCompany[]>([]);
  const [selectedGroupCompany, setSelectedGroupCompany] = useState<GroupCompany | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch group companies when type is subsidiary
  useEffect(() => {
    if (formData.type === 'subsidiary') {
      fetch('/api/companies')
        .then((res) => res.json())
        .then((data) => {
          const groups = data.companies?.filter((c: any) => c.type === 'group') || [];
          setGroupCompanies(groups);
          if (groups.length > 0 && !formData.parentCompanyId) {
            setSelectedGroupCompany(groups[0]);
            setFormData((prev) => ({ ...prev, parentCompanyId: groups[0]._id }));
          }
        })
        .catch((err) => console.error('Error fetching companies:', err));
    } else {
      setGroupCompanies([]);
      setSelectedGroupCompany(null);
      setFormData((prev) => ({ ...prev, parentCompanyId: '' }));
    }
  }, [formData.type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.legalName || !formData.taxNumber || !formData.country) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          parentCompanyId: formData.type === 'subsidiary' && formData.parentCompanyId ? formData.parentCompanyId : undefined,
          settings: {
            legalName: formData.legalName,
            taxNumber: formData.taxNumber,
            country: formData.country,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Şirket oluşturma işlemi başarısız oldu.');
        return;
      }

      // Success, redirect to companies list
      router.push('/dashboard/organizations');
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 justify-center py-10 sm:py-16 md:py-20 px-4">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Breadcrumbs */}
            <div className="flex flex-wrap gap-2 px-4 mb-4">
              <Link
                href="/dashboard"
                className="text-slate-400 dark:text-[#92adc9] text-base font-medium leading-normal hover:text-primary dark:hover:text-primary transition-colors"
              >
                Papirai
              </Link>
              <span className="text-slate-400 dark:text-[#92adc9] text-base font-medium leading-normal">/</span>
              <Link
                href="/dashboard/organizations"
                className="text-slate-400 dark:text-[#92adc9] text-base font-medium leading-normal hover:text-primary dark:hover:text-primary transition-colors"
              >
                Grup Şirketleri
              </Link>
              <span className="text-slate-400 dark:text-[#92adc9] text-base font-medium leading-normal">/</span>
              <span className="text-slate-800 dark:text-white text-base font-medium leading-normal">Yeni Şirket</span>
            </div>

            {/* Page Heading */}
            <div className="flex flex-wrap justify-between gap-3 p-4 mb-8">
              <p className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">
                Yeni Şirket Oluştur
              </p>
            </div>

            {/* Form Container */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-10 space-y-8">
              {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Form Section: General Information */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Genel Bilgiler</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    {/* Group Company (Read-only, shown when type is subsidiary) */}
                    {formData.type === 'subsidiary' && (
                      <>
                        <div className="flex flex-col min-w-40 flex-1">
                          <p className="text-slate-800 dark:text-white text-base font-medium leading-normal pb-2">
                            Grup Şirketi
                          </p>
                          <div className="relative w-full">
                            <select
                              name="parentCompanyId"
                              value={formData.parentCompanyId}
                              onChange={handleChange}
                              required={formData.type === 'subsidiary'}
                              disabled={loading}
                              className="form-select appearance-none w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-500 dark:text-[#92adc9] bg-slate-100 dark:bg-[#233648] h-14 p-[15px] text-base font-normal leading-normal cursor-not-allowed"
                            >
                              {groupCompanies.length > 0 ? (
                                groupCompanies.map((company) => (
                                  <option key={company._id} value={company._id}>
                                    {company.name}
                                  </option>
                                ))
                              ) : (
                                <option value="">Grup şirketi bulunamadı</option>
                              )}
                            </select>
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                              expand_more
                            </span>
                          </div>
                        </div>
                        {/* Spacer for layout */}
                        <div className="hidden md:block"></div>
                      </>
                    )}

                    {/* Company Type */}
                    <label className="flex flex-col min-w-40 flex-1">
                      <p className="text-slate-800 dark:text-white text-base font-medium leading-normal pb-2">
                        Şirket Tipi *
                      </p>
                      <div className="relative w-full">
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="form-select appearance-none w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-[#324d67] bg-background-light dark:bg-[#192633] focus:border-primary dark:focus:border-primary h-14 p-[15px] text-base font-normal leading-normal"
                        >
                          <option value="group">Grup Şirketi</option>
                          <option value="subsidiary">Yan Kuruluş</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </label>

                    {/* Spacer for layout when type is group */}
                    {formData.type === 'group' && <div className="hidden md:block"></div>}

                    {/* Name (Required) */}
                    <label className="flex flex-col min-w-40 flex-1">
                      <p className="text-slate-800 dark:text-white text-base font-medium leading-normal pb-2">
                        Şirket Adı *
                      </p>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-[#324d67] bg-background-light dark:bg-[#192633] focus:border-primary dark:focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#92adc9] p-[15px] text-base font-normal leading-normal"
                        placeholder="Şirket adını girin"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </label>

                    {/* Legal Name (Required) */}
                    <label className="flex flex-col min-w-40 flex-1">
                      <p className="text-slate-800 dark:text-white text-base font-medium leading-normal pb-2">
                        Yasal Ad *
                      </p>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-[#324d67] bg-background-light dark:bg-[#192633] focus:border-primary dark:focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#92adc9] p-[15px] text-base font-normal leading-normal"
                        placeholder="Yasal adı girin"
                        name="legalName"
                        value={formData.legalName}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </label>

                    {/* Tax Number (Required) */}
                    <label className="flex flex-col min-w-40 flex-1">
                      <p className="text-slate-800 dark:text-white text-base font-medium leading-normal pb-2">
                        Vergi Numarası *
                      </p>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-[#324d67] bg-background-light dark:bg-[#192633] focus:border-primary dark:focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#92adc9] p-[15px] text-base font-normal leading-normal"
                        placeholder="Vergi numarasını girin"
                        name="taxNumber"
                        value={formData.taxNumber}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </label>

                    {/* Country (Required) */}
                    <label className="flex flex-col min-w-40 flex-1">
                      <p className="text-slate-800 dark:text-white text-base font-medium leading-normal pb-2">
                        Ülke *
                      </p>
                      <div className="relative w-full">
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="form-select appearance-none w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-[#324d67] bg-background-light dark:bg-[#192633] focus:border-primary dark:focus:border-primary h-14 p-[15px] text-base font-normal leading-normal"
                        >
                          <option disabled value="">
                            Ülke seçin
                          </option>
                          <option value="TR">Türkiye</option>
                          <option value="US">Amerika Birleşik Devletleri</option>
                          <option value="CA">Kanada</option>
                          <option value="DE">Almanya</option>
                          <option value="GB">Birleşik Krallık</option>
                          <option value="FR">Fransa</option>
                          <option value="IT">İtalya</option>
                          <option value="ES">İspanya</option>
                          <option value="NL">Hollanda</option>
                          <option value="BE">Belçika</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Link href="/dashboard/organizations">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-base font-bold leading-normal transition-colors"
                    >
                      İptal
                    </button>
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white text-base font-bold leading-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-xl">check</span>
                    <span>{loading ? 'Oluşturuluyor...' : 'Şirket Oluştur'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


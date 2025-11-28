'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Company {
  _id: string;
  name: string;
  type?: 'group' | 'subsidiary';
  parentCompanyId?: string;
}

export default function NewWorkspacePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    companyId: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch companies on mount
  useEffect(() => {
    fetch('/api/companies')
      .then((res) => res.json())
      .then((data) => {
        const companyList = data.companies || [];
        setCompanies(companyList);
        // If user has a company, set it as default
        if (companyList.length > 0) {
          const defaultCompany = companyList[0];
          setSelectedCompany(defaultCompany);
          setFormData((prev) => ({ ...prev, companyId: defaultCompany._id }));
        }
      })
      .catch((err) => console.error('Error fetching companies:', err));
  }, []);

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find((c) => c._id === companyId);
    if (company) {
      setSelectedCompany(company);
      setFormData((prev) => ({ ...prev, companyId: company._id }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    if (!formData.name || !formData.type || !formData.companyId) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          companyId: formData.companyId,
          description: formData.description || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Çalışma alanı oluşturma işlemi başarısız oldu.');
        return;
      }

      // Success, redirect to workspaces list
      router.push('/dashboard/workspaces');
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark">
      <div className="flex w-full max-w-2xl flex-col rounded-xl bg-white dark:bg-[#111a22] shadow-2xl dark:shadow-black/20">
        {/* Form Header */}
        <div className="border-b border-gray-200 dark:border-[#324d67]/50 p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yeni Çalışma Alanı Oluştur</h1>
            <p className="text-sm text-gray-500 dark:text-[#92adc9]">
              Organizasyonda yeni bir çalışma alanı oluşturmak için aşağıdaki bilgileri doldurun.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
          {/* Company Field (Selectable) */}
          <label className="flex flex-col">
            <p className="pb-2 text-sm font-medium text-gray-700 dark:text-white">Şirket *</p>
            <Select
              value={formData.companyId}
              onValueChange={handleCompanyChange}
              disabled={loading || companies.length === 0}
              required
            >
              <SelectTrigger className="h-12 w-full bg-white dark:bg-white text-gray-900 dark:text-gray-900 border-gray-300 dark:border-gray-300">
                <SelectValue placeholder={companies.length === 0 ? 'Şirket yükleniyor...' : 'Şirket seçin'}>
                  {selectedCompany?.name || 'Şirket seçin'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-white text-gray-900 dark:text-gray-900 border-gray-300 dark:border-gray-300">
                {companies.map((company) => (
                  <SelectItem 
                    key={company._id} 
                    value={company._id}
                    className="bg-white dark:bg-white text-gray-900 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-100 focus:bg-gray-100 dark:focus:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">
                        {company.type === 'group' ? 'corporate_fare' : 'business'}
                      </span>
                      <span>{company.name}</span>
                      {company.type === 'group' && (
                        <span className="text-xs text-gray-600 dark:text-gray-600">(Grup)</span>
                      )}
                      {company.type === 'subsidiary' && (
                        <span className="text-xs text-gray-600 dark:text-gray-600">(Alt Şirket)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companies.length > 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {companies.filter((c) => c.type === 'group').length > 0 && 'Grup şirketleri ve alt şirketler seçilebilir.'}
              </p>
            )}
          </label>

          {/* Workspace Name Field */}
          <label className="flex flex-col">
            <p className="pb-2 text-sm font-medium text-gray-700 dark:text-white">Çalışma Alanı Adı *</p>
            <input
              className="form-input h-12 w-full flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-white p-3 text-base font-normal leading-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#324d67] dark:bg-[#192633] dark:text-white dark:placeholder:text-[#92adc9] dark:focus:border-primary"
              placeholder="örn. Q4 Pazarlama Kampanyaları"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          {/* Workspace Type Field */}
          <label className="flex flex-col">
            <p className="pb-2 text-sm font-medium text-gray-700 dark:text-white">Çalışma Alanı Tipi *</p>
            <div className="relative w-full">
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                disabled={loading}
                className="form-select h-12 w-full flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-white p-3 text-base font-normal leading-normal text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#324d67] dark:bg-[#192633] dark:text-white dark:focus:border-primary appearance-none pr-10"
              >
                <option disabled value="">
                  Tip seçin
                </option>
                <option value="sales">Satış</option>
                <option value="procurement">Tedarik</option>
                <option value="hr">İnsan Kaynakları</option>
                <option value="legal">Hukuk</option>
                <option value="finance">Finans</option>
                <option value="operations">Operasyonlar</option>
                <option value="it">Bilgi Teknolojileri</option>
                <option value="marketing">Pazarlama</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#92adc9] pointer-events-none">
                expand_more
              </span>
            </div>
          </label>

          {/* Description Field */}
          <label className="flex flex-col">
            <p className="pb-2 text-sm font-medium text-gray-700 dark:text-white">Açıklama (İsteğe Bağlı)</p>
            <textarea
              className="form-textarea min-h-28 w-full flex-1 resize-y overflow-hidden rounded-lg border border-gray-300 bg-white p-3 text-base font-normal leading-normal text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#324d67] dark:bg-[#192633] dark:text-white dark:placeholder:text-[#92adc9] dark:focus:border-primary"
              placeholder="Bu çalışma alanı için kısa bir açıklama girin"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
            />
          </label>

          {/* Form Actions */}
          <div className="flex flex-row-reverse items-center gap-3 border-t border-gray-200 dark:border-[#324d67]/50 pt-6 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Kaydediliyor...' : 'Çalışma Alanını Kaydet'}
            </button>
            <Link href="/dashboard/workspaces">
              <button
                type="button"
                className="flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-[#324d67] dark:bg-[#192633] dark:text-white dark:hover:bg-[#233648]"
              >
                İptal
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}


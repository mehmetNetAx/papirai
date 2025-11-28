'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function UserSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (searchParams.get('role')) params.set('role', searchParams.get('role')!);
    if (searchParams.get('status')) params.set('status', searchParams.get('status')!);
    router.push(`/dashboard/users?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full md:max-w-md">
      <label className="flex flex-col w-full">
        <div className="relative flex w-full items-center">
          <span className="material-symbols-outlined absolute left-3 text-gray-400 dark:text-[#92adc9]">
            search
          </span>
          <input
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111a22] h-11 placeholder:text-gray-400 dark:placeholder:text-[#92adc9] pl-10 pr-4 text-sm font-normal"
            placeholder="İsim veya e-posta ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </label>
    </form>
  );
}


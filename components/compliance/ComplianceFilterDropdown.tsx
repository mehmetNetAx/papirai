'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface ComplianceFilterDropdownProps {
  name: 'status' | 'alertLevel';
  options: { value: string; label: string }[];
}

export default function ComplianceFilterDropdown({ name, options }: ComplianceFilterDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentValue = searchParams.get(name) || 'all';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams();
    if (searchParams.get('status') && name !== 'status') params.set('status', searchParams.get('status')!);
    if (searchParams.get('alertLevel') && name !== 'alertLevel') params.set('alertLevel', searchParams.get('alertLevel')!);
    if (searchParams.get('page')) params.set('page', searchParams.get('page')!);
    if (e.target.value !== 'all') params.set(name, e.target.value);
    router.push(`/dashboard/compliance?${params.toString()}`);
  };

  return (
    <select
      value={currentValue}
      onChange={handleChange}
      className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-[#111a22] border border-gray-300 dark:border-gray-700 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-white text-sm font-medium leading-normal appearance-none pr-8 cursor-pointer"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}


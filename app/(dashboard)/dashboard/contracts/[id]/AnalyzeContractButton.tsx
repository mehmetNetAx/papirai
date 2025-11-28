'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AnalyzeContractButtonProps {
  contractId: string;
  contractTitle: string;
}

export default function AnalyzeContractButton({
  contractId,
  contractTitle,
}: AnalyzeContractButtonProps) {
  return (
    <Button variant="outline" asChild>
      <Link href={`/dashboard/contracts/${contractId}/analyze`}>
        <span className="material-symbols-outlined text-lg mr-2">analytics</span>
        Sözleşme Analizi
      </Link>
    </Button>
  );
}


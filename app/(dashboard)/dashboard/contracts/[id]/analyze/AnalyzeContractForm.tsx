'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AnalyzeContractFormProps {
  contractId: string;
  contractTitle: string;
  showAsButton?: boolean;
}

export default function AnalyzeContractForm({
  contractId,
  contractTitle,
  showAsButton = false,
}: AnalyzeContractFormProps) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Analiz sırasında bir hata oluştu');
      }

      // Refresh the page to show results
      router.refresh();
    } catch (err: any) {
      console.error('Error analyzing contract:', err);
      setError(err.message || 'Analiz sırasında bir hata oluştu');
      setIsAnalyzing(false);
    }
  };

  if (showAsButton) {
    return (
      <Button onClick={handleAnalyze} disabled={isAnalyzing} variant="outline">
        <span className="material-symbols-outlined text-base mr-2">
          {isAnalyzing ? 'hourglass_empty' : 'refresh'}
        </span>
        {isAnalyzing ? 'Analiz Ediliyor...' : 'Yeniden Analiz Et'}
      </Button>
    );
  }

  return (
    <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white font-display">
          Sözleşme Analizi
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-600">
          Yapay zeka ile sözleşmenizi çok boyutlu olarak analiz edin. Analiz, operasyonel, finansal, risk, hukuk, kalite ve eksiklikler açısından değerlendirme yapacaktır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Analiz Kapsamı
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>Operasyonel değerlendirme</li>
            <li>Finansal analiz</li>
            <li>Risk değerlendirmesi</li>
            <li>Hukuki uygunluk kontrolü</li>
            <li>Kalite değerlendirmesi</li>
            <li>Eksik taraflar ve şartnameler</li>
          </ul>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          size="lg"
          className="w-full"
        >
          <span className="material-symbols-outlined text-base mr-2">
            {isAnalyzing ? 'hourglass_empty' : 'analytics'}
          </span>
          {isAnalyzing ? 'Analiz Ediliyor...' : 'Analiz Et'}
        </Button>

        {isAnalyzing && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sözleşme analiz ediliyor, lütfen bekleyin...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


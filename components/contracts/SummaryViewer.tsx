'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Summary {
  _id: string;
  summaryType: 'auto' | 'manual';
  summary: string;
  model: string;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface SummaryViewerProps {
  contractId: string;
  className?: string;
}

export default function SummaryViewer({ contractId, className }: SummaryViewerProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, [contractId]);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/summary`);
      if (!response.ok) throw new Error('Failed to load summary');
      const data = await response.json();
      setSummary(data.summary);
    } catch (err: any) {
      console.error('Error loading summary:', err);
      setError(err.message || 'Özet yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryType: 'manual',
          maxLength: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setError(err.message || 'Özet oluşturulurken bir hata oluştu');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className={`border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">summarize</span>
            Sözleşme Özeti
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating || loading}
          >
            {generating ? (
              <>
                <span className="material-symbols-outlined text-sm mr-1 animate-spin">sync</span>
                Oluşturuluyor...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm mr-1">refresh</span>
                Yenile
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 block animate-pulse">summarize</span>
            <p>Özet yükleniyor...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && !summary && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">summarize</span>
            <p>Henüz özet oluşturulmamış.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="mt-4"
            >
              <span className="material-symbols-outlined text-sm mr-1">add</span>
              Özet Oluştur
            </Button>
          </div>
        )}

        {!loading && !error && summary && (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none dark:prose-invert text-gray-700 dark:text-gray-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.summary}</ReactMarkdown>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-800">
              <div>
                <span className="font-medium">Model:</span> {summary.model}
                {summary.summaryType === 'auto' && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded">
                    Otomatik
                  </span>
                )}
              </div>
              <div>
                {format(new Date(summary.updatedAt), 'dd MMM yyyy HH:mm', { locale: tr })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


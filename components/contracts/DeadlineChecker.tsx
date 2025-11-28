'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface ContractNeedingAttention {
  _id: string;
  title: string;
  alerts: string[];
  masterVariables: {
    endDate?: Date;
    terminationDeadline?: Date;
    contractValue?: number;
  };
}

export default function DeadlineChecker() {
  const [contracts, setContracts] = useState<ContractNeedingAttention[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contracts/master-variables/attention');
      if (!response.ok) throw new Error('Failed to load contracts');
      
      const data = await response.json();
      setContracts(data.contracts || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckDeadlines = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contracts/master-variables/check-deadlines', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to check deadlines');

      setLastChecked(new Date());
      await loadContracts();
      alert('Deadline kontrolü tamamlandı. Bildirimler gönderildi.');
    } catch (error: any) {
      alert(error.message || 'Deadline kontrolü sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getAlertColor = (alert: string) => {
    if (alert.includes('Kritik') || alert.includes('geçti')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    }
    if (alert.includes('Uyarı')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    }
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
  };

  return (
    <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
            Deadline Kontrolü ve Uyarılar
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckDeadlines}
            disabled={loading}
          >
            <span className="material-symbols-outlined text-base mr-2">
              {loading ? 'hourglass_empty' : 'refresh'}
            </span>
            {loading ? 'Kontrol Ediliyor...' : 'Kontrol Et'}
          </Button>
        </div>
        {lastChecked && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Son kontrol: {lastChecked.toLocaleString('tr-TR')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading && contracts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Yükleniyor...
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="mb-2">Tüm sözleşmeler güncel.</p>
            <p className="text-sm">Dikkat gerektiren sözleşme bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <Link
                key={contract._id}
                href={`/dashboard/contracts/${contract._id}`}
                className="block p-4 rounded-lg border border-orange-200/50 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {contract.title}
                  </h4>
                  <Badge className={getAlertColor(contract.alerts[0])}>
                    {contract.alerts.length} Uyarı
                  </Badge>
                </div>
                <div className="space-y-1">
                  {contract.alerts.map((alert, idx) => (
                    <p
                      key={idx}
                      className={`text-sm ${getAlertColor(alert).replace('bg-', 'text-').replace('dark:bg-', 'dark:text-')}`}
                    >
                      ⚠️ {alert}
                    </p>
                  ))}
                </div>
                {contract.masterVariables.endDate && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Bitiş: {new Date(contract.masterVariables.endDate).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


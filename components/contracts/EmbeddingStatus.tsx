'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EmbeddingStatusProps {
  contractId: string;
  hasEmbeddings?: boolean;
  onEmbeddingGenerated?: () => void;
  className?: string;
}

export default function EmbeddingStatus({
  contractId,
  hasEmbeddings: initialHasEmbeddings,
  onEmbeddingGenerated,
  className,
}: EmbeddingStatusProps) {
  const [hasEmbeddings, setHasEmbeddings] = useState(initialHasEmbeddings ?? false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setHasEmbeddings(initialHasEmbeddings ?? false);
  }, [initialHasEmbeddings]);

  const checkEmbeddingStatus = async () => {
    setChecking(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/embeddings`);
      if (response.ok) {
        const data = await response.json();
        setHasEmbeddings(data.hasEmbeddings);
      }
    } catch (error) {
      console.error('Error checking embedding status:', error);
    } finally {
      setChecking(false);
    }
  };

  const generateEmbeddings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/embeddings`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate embeddings');
      }

      const data = await response.json();
      setHasEmbeddings(true);
      
      if (onEmbeddingGenerated) {
        onEmbeddingGenerated();
      }
    } catch (error: any) {
      console.error('Error generating embeddings:', error);
      alert(`Embedding oluşturulurken bir hata oluştu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (hasEmbeddings) {
    return (
      <Badge className={`bg-green-500 hover:bg-green-600 text-white ${className}`}>
        <span className="material-symbols-outlined text-xs mr-1">check_circle</span>
        AI Hazır
      </Badge>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Badge 
          variant="outline" 
          className={`border-yellow-500 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 cursor-pointer ${className}`}
        >
          <span className="material-symbols-outlined text-xs mr-1">warning</span>
          AI Hazır Değil
        </Badge>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>AI Özellikleri Hazır Değil</AlertDialogTitle>
          <AlertDialogDescription>
            Bu sözleşme için embedding'ler oluşturulmamış. AI Chat ve AI Search özelliklerini kullanmak için embedding'leri oluşturmanız gerekiyor.
            <br /><br />
            Bu işlem birkaç dakika sürebilir ve sözleşme içeriğinin uzunluğuna bağlıdır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction
            onClick={generateEmbeddings}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm mr-1 animate-spin">sync</span>
                Oluşturuluyor...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm mr-1">auto_awesome</span>
                Embedding Oluştur
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


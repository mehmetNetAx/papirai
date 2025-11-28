'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/alert-dialog';

interface ArchiveContractButtonProps {
  contractId: string;
  contractTitle: string;
  isActive?: boolean;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onArchived?: () => void;
}

export default function ArchiveContractButton({
  contractId,
  contractTitle,
  isActive = true,
  variant = 'outline',
  size = 'default',
  onArchived,
}: ArchiveContractButtonProps) {
  const [open, setOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const router = useRouter();

  const isCurrentlyActive = isActive !== false; // Default to true if undefined

  const handleToggle = async () => {
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isCurrentlyActive }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || (isCurrentlyActive ? 'Sözleşme arşive kaldırılırken bir hata oluştu' : 'Sözleşme aktif hale getirilirken bir hata oluştu'));
      }

      setOpen(false);
      
      // Callback if provided
      if (onArchived) {
        onArchived();
      } else {
        // Redirect to contracts list
        router.push('/dashboard/contracts');
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error toggling contract status:', error);
      alert((isCurrentlyActive ? 'Sözleşme arşive kaldırılırken bir hata oluştu: ' : 'Sözleşme aktif hale getirilirken bir hata oluştu: ') + error.message);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={
          isCurrentlyActive
            ? 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
        }
      >
        <span className="material-symbols-outlined text-lg mr-2">
          {isCurrentlyActive ? 'archive' : 'unarchive'}
        </span>
        {isCurrentlyActive ? 'Arşive Kaldır' : 'Aktif Hale Getir'}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-900">
              {isCurrentlyActive ? 'Sözleşmeyi Arşive Kaldır' : 'Sözleşmeyi Aktif Hale Getir'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-600">
              <strong>{contractTitle}</strong> sözleşmesini{' '}
              {isCurrentlyActive
                ? 'arşive kaldırmak istediğinizden emin misiniz?'
                : 'aktif hale getirmek istediğinizden emin misiniz?'}
              <br />
              <br />
              {isCurrentlyActive
                ? 'Arşive kaldırılan sözleşmeler listede görünmeyecek ancak veritabanında saklanmaya devam edecektir. İsterseniz daha sonra tekrar aktif hale getirebilirsiniz.'
                : 'Aktif hale getirilen sözleşmeler listede görünecek ve normal şekilde kullanılabilecektir.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setOpen(false)}
              disabled={isArchiving}
              className="bg-white dark:bg-white text-gray-900 dark:text-gray-900 border-gray-300 dark:border-gray-300"
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
              disabled={isArchiving}
              className={isCurrentlyActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
            >
              {isArchiving
                ? isCurrentlyActive
                  ? 'Arşive Kaldırılıyor...'
                  : 'Aktif Hale Getiriliyor...'
                : isCurrentlyActive
                ? 'Arşive Kaldır'
                : 'Aktif Hale Getir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


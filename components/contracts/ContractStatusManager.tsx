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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContractStatus,
  statusLabels,
  validTransitions,
  getStatusDescription,
  getValidNextStatuses,
} from '@/lib/utils/contract-status';

interface ContractStatusManagerProps {
  contractId: string;
  contractTitle: string;
  currentStatus: ContractStatus;
  onStatusChange?: () => void;
}

export default function ContractStatusManager({
  contractId,
  contractTitle,
  currentStatus,
  onStatusChange,
}: ContractStatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus>(currentStatus);
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const availableStatuses = getValidNextStatuses(currentStatus);

  const handleStatusChange = async () => {
    if (selectedStatus === currentStatus) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Sözleşme durumu güncellenirken bir hata oluştu');
      }

      setOpen(false);
      
      // Callback if provided
      if (onStatusChange) {
        onStatusChange();
      } else {
        // Refresh the page
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error updating contract status:', error);
      alert('Sözleşme durumu güncellenirken bir hata oluştu: ' + error.message);
      setSelectedStatus(currentStatus); // Revert selection on error
    } finally {
      setIsUpdating(false);
    }
  };


  return (
    <>
      <div className="flex items-center gap-3">
        <Select
          value={selectedStatus}
          onValueChange={(value) => {
            setSelectedStatus(value as ContractStatus);
            if (value !== currentStatus) {
              setOpen(true);
            }
          }}
        >
          <SelectTrigger className="w-[200px] bg-white dark:bg-white text-gray-900 dark:text-gray-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-white">
            <SelectItem value={currentStatus} disabled>
              {statusLabels[currentStatus]} (Mevcut)
            </SelectItem>
            {availableStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
            {availableStatuses.length === 0 && (
              <SelectItem value={currentStatus} disabled>
                Durum değiştirilemez
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-900">
              Sözleşme Durumunu Değiştir
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-600">
              <strong>{contractTitle}</strong> sözleşmesinin durumunu{' '}
              <strong>{statusLabels[currentStatus]}</strong> durumundan{' '}
              <strong>{statusLabels[selectedStatus]}</strong> durumuna değiştirmek istediğinizden emin misiniz?
              <br />
              <br />
              <span className="text-sm italic">{getStatusDescription(selectedStatus)}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setOpen(false);
                setSelectedStatus(currentStatus); // Revert selection
              }}
              disabled={isUpdating}
              className="bg-white dark:bg-white text-gray-900 dark:text-gray-900 border-gray-300 dark:border-gray-300"
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              disabled={isUpdating}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isUpdating ? 'Güncelleniyor...' : 'Durumu Değiştir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


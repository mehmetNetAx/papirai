'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';

interface Contract {
  id: string;
  title: string;
  status: string;
  workspaceId?: string;
  workspaceName?: string;
  companyId?: string;
  companyName?: string;
}

interface UserContractAssignmentProps {
  userId: string;
  assignedContracts: Contract[];
}

export default function UserContractAssignment({ 
  userId,
  assignedContracts 
}: UserContractAssignmentProps) {
  const [contracts, setContracts] = useState<Contract[]>(assignedContracts);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [contractToRemove, setContractToRemove] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRemoveContract = async () => {
    if (!contractToRemove) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/contracts/${contractToRemove.id}/users?userId=${userId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove contract');
      }

      setContracts(contracts.filter(c => c.id !== contractToRemove.id));
      setShowRemoveDialog(false);
      setContractToRemove(null);
      // Reload the page to refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error removing contract:', error);
      alert('Sözleşme çıkarılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      pending_signature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
      executed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getStatusLabel = (status: string) => {
    const labelMap: Record<string, string> = {
      draft: 'Taslak',
      in_review: 'İncelemede',
      pending_approval: 'Onay Bekliyor',
      approved: 'Onaylandı',
      pending_signature: 'İmza Bekliyor',
      executed: 'Yürürlükte',
      expired: 'Süresi Doldu',
      terminated: 'Feshedildi',
    };
    return labelMap[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atanan Sözleşmeler</CardTitle>
        <CardDescription>
          Kullanıcının görüntüleme yetkisi olan sözleşmeler (özellikle karşı taraf kullanıcıları için)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {contracts.length > 0 ? (
          <div className="space-y-2">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/dashboard/contracts/${contract.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {contract.title}
                    </Link>
                    <Badge className={getStatusColor(contract.status)}>
                      {getStatusLabel(contract.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {contract.workspaceName && (
                      <span>Workspace: {contract.workspaceName}</span>
                    )}
                    {contract.companyName && (
                      <span>• Şirket: {contract.companyName}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setContractToRemove(contract);
                    setShowRemoveDialog(true);
                  }}
                  disabled={loading}
                >
                  Çıkar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Henüz atanmış sözleşme yok</p>
        )}

        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sözleşmeyi Çıkar</AlertDialogTitle>
              <AlertDialogDescription>
                {contractToRemove?.title} sözleşmesini bu kullanıcıdan çıkarmak istediğinize emin misiniz?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveContract}>Çıkar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}


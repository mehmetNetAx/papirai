'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface Contract {
  _id: string;
  title: string;
  value?: number;
  currency?: string;
  status: string;
}

interface MetricDetailDialogProps {
  metricType: 'totalValue' | 'totalContracts' | 'activeContracts' | 'expiringSoon' | 'totalVariables' | 'complianceTracked' | 'pendingApprovals' | 'complianceAlerts';
  title: string;
  contracts?: Contract[];
  variables?: Array<{ _id: string; name: string; contractId: { _id: string; title: string } }>;
  approvals?: Array<{ _id: string; contractId: { _id: string; title: string }; status: string }>;
  complianceChecks?: Array<{ _id: string; contractId: { _id: string; title: string }; status: string; alertLevel: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Taslak',
    in_review: 'İncelemede',
    pending_approval: 'Onay Bekliyor',
    approved: 'Onaylandı',
    pending_signature: 'İmza Bekliyor',
    executed: 'Yürürlükte',
    expired: 'Süresi Doldu',
    terminated: 'Feshedildi',
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
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
}

export default function MetricDetailDialog({
  metricType,
  title,
  contracts = [],
  variables = [],
  approvals = [],
  complianceChecks = [],
  open,
  onOpenChange,
}: MetricDetailDialogProps) {
  const formatCurrencyValue = (value: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderContent = () => {
    switch (metricType) {
      case 'totalValue':
        if (contracts.length === 0) {
          return (
            <p className="text-sm text-gray-500 text-center py-8">
              Değer bilgisi olan sözleşme bulunmuyor.
            </p>
          );
        }
        return (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {contracts.map((contract) => (
              <Link
                key={contract._id}
                href={`/dashboard/contracts/${contract._id}`}
                className="block"
              >
                <Card className="border border-gray-200/50 hover:border-primary/50 transition-colors bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 font-display truncate">
                          {contract.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(contract.status)}`}>
                            {getStatusLabel(contract.status)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-lg font-bold text-primary font-display">
                          {contract.value ? formatCurrencyValue(contract.value, contract.currency || 'TRY') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        );

      case 'totalContracts':
      case 'activeContracts':
      case 'expiringSoon':
        if (contracts.length === 0) {
          return (
            <p className="text-sm text-gray-500 text-center py-8">
              Sözleşme bulunmuyor.
            </p>
          );
        }
        return (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {contracts.map((contract) => (
              <Link
                key={contract._id}
                href={`/dashboard/contracts/${contract._id}`}
                className="block"
              >
                <Card className="border border-gray-200/50 hover:border-primary/50 transition-colors bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 font-display truncate">
                          {contract.title}
                        </p>
                        {contract.value && (
                          <p className="text-sm text-gray-500 mt-1">
                            {formatCurrencyValue(contract.value, contract.currency || 'TRY')}
                          </p>
                        )}
                      </div>
                      <span className={`ml-4 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(contract.status)}`}>
                        {getStatusLabel(contract.status)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        );

      case 'totalVariables':
      case 'complianceTracked':
        if (variables.length === 0) {
          return (
            <p className="text-sm text-gray-500 text-center py-8">
              Değişken bulunmuyor.
            </p>
          );
        }
        return (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {variables.map((variable) => (
              <Link
                key={variable._id}
                href={`/dashboard/contracts/${variable.contractId._id}`}
                className="block"
              >
                <Card className="border border-gray-200/50 hover:border-primary/50 transition-colors bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 font-display">
                          {variable.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {variable.contractId.title}
                        </p>
                      </div>
                      {metricType === 'complianceTracked' && (
                        <span className="ml-4 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                          Takip Ediliyor
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        );

      case 'pendingApprovals':
        if (approvals.length === 0) {
          return (
            <p className="text-sm text-gray-500 text-center py-8">
              Bekleyen onay bulunmuyor.
            </p>
          );
        }
        return (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {approvals.map((approval) => (
              <Link
                key={approval._id}
                href={`/dashboard/contracts/${approval.contractId._id}`}
                className="block"
              >
                <Card className="border border-gray-200/50 hover:border-primary/50 transition-colors bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 font-display truncate">
                          {approval.contractId.title}
                        </p>
                      </div>
                      <span className={`ml-4 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        approval.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : approval.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {approval.status === 'approved' ? 'Onaylandı' : approval.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        );

      case 'complianceAlerts':
        if (complianceChecks.length === 0) {
          return (
            <p className="text-sm text-gray-500 text-center py-8">
              Uyum uyarısı bulunmuyor.
            </p>
          );
        }
        return (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {complianceChecks.map((check) => (
              <Link
                key={check._id}
                href={`/dashboard/contracts/${check.contractId._id}`}
                className="block"
              >
                <Card className="border border-gray-200/50 hover:border-primary/50 transition-colors bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 font-display truncate">
                          {check.contractId.title}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          check.status === 'compliant'
                            ? 'bg-green-100 text-green-800'
                            : check.status === 'non_compliant'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {check.status === 'compliant' ? 'Uyumlu' : check.status === 'non_compliant' ? 'Uyumsuz' : 'Uyarı'}
                        </span>
                        {check.alertLevel && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            check.alertLevel === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : check.alertLevel === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {check.alertLevel === 'critical' ? 'Kritik' : check.alertLevel === 'high' ? 'Yüksek' : 'Orta'}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col bg-white dark:bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 font-display">
            {title} - Detaylar
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {metricType === 'totalValue' && 'Sözleşmeler ve değerleri'}
            {metricType === 'totalContracts' && 'Tüm sözleşmeler'}
            {metricType === 'activeContracts' && 'Aktif (yürürlükte) sözleşmeler'}
            {metricType === 'expiringSoon' && 'Yakında sona erecek sözleşmeler'}
            {metricType === 'totalVariables' && 'Tüm değişkenler'}
            {metricType === 'complianceTracked' && 'Uyum takibi yapılan değişkenler'}
            {metricType === 'pendingApprovals' && 'Bekleyen onaylar'}
            {metricType === 'complianceAlerts' && 'Uyum uyarıları'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}


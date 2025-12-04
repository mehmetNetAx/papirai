'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
// Toast hook will be handled via window.alert for now

interface UserLoggingToggleProps {
  userId: string;
  loggingEnabled: boolean;
  onUpdate?: () => void;
  compact?: boolean; // For table use
}

export default function UserLoggingToggle({ userId, loggingEnabled: initialLoggingEnabled, onUpdate, compact = false }: UserLoggingToggleProps) {
  const [loggingEnabled, setLoggingEnabled] = useState(initialLoggingEnabled);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loggingEnabled: checked,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update logging setting');
      }

      setLoggingEnabled(checked);
      
      // Only show alert if not in compact mode
      if (!compact) {
        if (checked) {
          alert('Logging etkinleştirildi. Bu kullanıcının aktiviteleri artık loglanacak.');
        } else {
          alert('Logging devre dışı bırakıldı. Bu kullanıcının aktiviteleri artık loglanmayacak.');
        }
      }

      if (onUpdate) {
        onUpdate();
      }
      
      // Refresh page if in compact mode (table)
      if (compact) {
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error updating logging setting:', error);
      if (!compact) {
        alert('Hata: ' + (error.message || 'Logging ayarı güncellenirken bir hata oluştu.'));
      }
      // Revert on error
      setLoggingEnabled(!checked);
    } finally {
      setLoading(false);
    }
  };

  // Compact version for table
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Switch
          id={`logging-toggle-${userId}`}
          checked={loggingEnabled}
          onCheckedChange={handleToggle}
          disabled={loading}
        />
        <Label 
          htmlFor={`logging-toggle-${userId}`} 
          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          {loggingEnabled ? 'Aktif' : 'Pasif'}
        </Label>
      </div>
    );
  }

  // Full version for detail page
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="flex-1">
        <Label htmlFor={`logging-toggle-${userId}`} className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
          Aktivite Loglama
        </Label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {loggingEnabled 
            ? 'Bu kullanıcının aktiviteleri loglanıyor.'
            : 'Bu kullanıcının aktiviteleri loglanmıyor.'}
        </p>
      </div>
      <Switch
        id={`logging-toggle-${userId}`}
        checked={loggingEnabled}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
}


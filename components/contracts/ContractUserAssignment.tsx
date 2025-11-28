'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// Toast functionality - simple implementation
const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
  // Simple alert for now - can be replaced with proper toast component
  if (variant === 'destructive') {
    alert(`${title}: ${description}`);
  } else {
    console.log(`${title}: ${description}`);
  }
};

interface User {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
}

interface ContractUserAssignmentProps {
  contractId: string;
}

export default function ContractUserAssignment({ contractId }: ContractUserAssignmentProps) {
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [allowedEditors, setAllowedEditors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, [contractId]);

  const loadUsers = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/users`);
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      const data = await response.json();
      setAssignedUsers(data.assignedUsers || []);
      setAllowedEditors(data.allowedEditors || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Hata', 'Kullanıcılar yüklenirken bir hata oluştu', 'destructive');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      // Filter out already assigned users
      const assignedIds = new Set([
        ...assignedUsers.map(u => u.id),
        ...allowedEditors.map(u => u.id),
      ]);
      setSearchResults(data.users.filter((u: User) => !assignedIds.has(u.id)));
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddUser = async (user: User) => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to add user');
      }

      // Reload users to get updated list
      await loadUsers();
      setSearchQuery('');
      setSearchResults([]);
      showToast('Başarılı', `${user.name} sözleşmeye atandı`);
    } catch (error: any) {
      console.error('Error adding user:', error);
      showToast('Hata', error.message || 'Kullanıcı eklenirken bir hata oluştu', 'destructive');
    }
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;

    try {
      const response = await fetch(
        `/api/contracts/${contractId}/users?userId=${userToRemove.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      setAssignedUsers(assignedUsers.filter(u => u.id !== userToRemove.id));
      setShowRemoveDialog(false);
      setUserToRemove(null);
      showToast('Başarılı', `${userToRemove.name} sözleşmeden çıkarıldı`);
    } catch (error) {
      console.error('Error removing user:', error);
      showToast('Hata', 'Kullanıcı çıkarılırken bir hata oluştu', 'destructive');
    }
  };

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atanan Kullanıcılar</CardTitle>
        <CardDescription>
          Sözleşmeye görüntüleme yetkisi olan kullanıcılar (özellikle karşı taraf kullanıcıları)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Input
            placeholder="Kullanıcı ara..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.companyName && (
                      <Badge variant="outline" className="mt-1">
                        {user.companyName}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddUser(user)}
                  >
                    Ekle
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Users List */}
        {assignedUsers.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium">Atanan Kullanıcılar</h4>
            {assignedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  {user.companyName && (
                    <Badge variant="outline" className="mt-1">
                      {user.companyName}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setUserToRemove(user);
                    setShowRemoveDialog(true);
                  }}
                >
                  Çıkar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Henüz atanmış kullanıcı yok</p>
        )}

        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kullanıcıyı Çıkar</AlertDialogTitle>
              <AlertDialogDescription>
                {userToRemove?.name} kullanıcısını bu sözleşmeden çıkarmak istediğinize emin misiniz?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveUser}>Çıkar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}


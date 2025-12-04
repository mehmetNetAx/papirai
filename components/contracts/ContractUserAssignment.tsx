'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const router = useRouter();
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [allowedEditors, setAllowedEditors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'contract_manager' | 'legal_reviewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [contractId]);

  const loadUsers = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/users`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Handle 403 Forbidden - user doesn't have permission
        if (response.status === 403) {
          const errorMessage = errorData.error || 'Bu sözleşmeyi görüntüleme yetkiniz bulunmamaktadır.';
          alert(`Yetki Hatası\n\n${errorMessage}\n\nDashboard sayfasına yönlendiriliyorsunuz...`);
          router.push('/dashboard');
          return;
        }
        
        console.error('Failed to load users - Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || `Failed to load users: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setAssignedUsers(data.assignedUsers || []);
      setAllowedEditors(data.allowedEditors || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      // Don't show toast if we're redirecting (403 case)
      if (error.message && !error.message.includes('403')) {
        showToast('Hata', error.message || 'Kullanıcılar yüklenirken bir hata oluştu', 'destructive');
      }
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

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      setInviteError('Lütfen e-posta adresini girin.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    setInviting(true);
    setInviteError('');
    setInviteSuccess(false);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          contractId,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || 'Davet gönderilemedi.');
        return;
      }

      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        setShowInviteDialog(false);
        setInviteSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('[InviteUser] Unexpected error:', error);
      setInviteError(error?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setInviting(false);
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
        {/* Invite Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setShowInviteDialog(true);
              setInviteEmail('');
              setInviteError('');
              setInviteSuccess(false);
            }}
          >
            E-posta ile Davet Et
          </Button>
        </div>

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

        {/* Invite Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sözleşmeye Kullanıcı Davet Et</DialogTitle>
              <DialogDescription>
                E-posta adresi ile yeni bir kullanıcıyı bu sözleşmeye davet edin. Davet edilen kullanıcı sadece bu sözleşmeyi görebilecek.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {inviteError && (
                <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                  <AlertDescription className="text-red-600 dark:text-red-400">
                    {inviteError}
                  </AlertDescription>
                </Alert>
              )}
              {inviteSuccess && (
                <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    Davet başarıyla gönderildi!
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-posta Adresi</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="kullanici@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviting || inviteSuccess}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Rol</Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'contract_manager' | 'legal_reviewer')}
                  disabled={inviting || inviteSuccess}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#324d67] bg-white dark:bg-[#192633] text-gray-900 dark:text-white"
                >
                  <option value="viewer">Görüntüleyici</option>
                  <option value="contract_manager">Sözleşme Yöneticisi</option>
                  <option value="legal_reviewer">Hukuk İnceleyici</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteDialog(false);
                  setInviteEmail('');
                  setInviteError('');
                  setInviteSuccess(false);
                }}
                disabled={inviting}
              >
                İptal
              </Button>
              <Button
                onClick={handleInviteUser}
                disabled={inviting || inviteSuccess}
                className="button button-egg-blue"
              >
                {inviting ? 'Gönderiliyor...' : 'Davet Gönder'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}


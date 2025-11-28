'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface EditUserFormProps {
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    companyId: string;
    companyName: string;
    groupId?: string;
    groupName?: string;
    permissions?: {
      canEdit: boolean;
      canApprove: boolean;
      canDelete: boolean;
      canManageUsers: boolean;
      workspaces: string[];
    };
  };
  companies: Array<{ _id: string; name: string; type: string }>;
  currentUserRole: string;
}

export default function EditUserForm({ user, companies, currentUserRole }: EditUserFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    companyId: user.companyId,
    groupId: user.groupId || '',
    permissions: {
      canEdit: Boolean(user.permissions?.canEdit),
      canApprove: Boolean(user.permissions?.canApprove),
      canDelete: Boolean(user.permissions?.canDelete),
      canManageUsers: Boolean(user.permissions?.canManageUsers),
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
          companyId: formData.companyId,
          groupId: formData.groupId || undefined,
          permissions: formData.permissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kullanıcı güncellenirken bir hata oluştu');
      }

      router.push(`/dashboard/users/${user._id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Kullanıcı güncellenirken bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const roleOptions = [
    { value: 'system_admin', label: 'Sistem Yöneticisi' },
    { value: 'group_admin', label: 'Grup Yöneticisi' },
    { value: 'company_admin', label: 'Şirket Yöneticisi' },
    { value: 'contract_manager', label: 'Sözleşme Yöneticisi' },
    { value: 'legal_reviewer', label: 'Hukuk İnceleyici' },
    { value: 'viewer', label: 'Görüntüleyici' },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link href={`/dashboard/users/${user._id}`}>
                <Button variant="ghost" size="sm">
                  <span className="material-symbols-outlined text-lg mr-2">arrow_back</span>
                  Geri
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kullanıcı Düzenle</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user.name || user.email} kullanıcısının bilgilerini güncelleyin
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Kullanıcı Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentUserRole === 'system_admin' && companies.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="companyId">Şirket</Label>
                  <Select
                    value={formData.companyId}
                    onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company._id} value={company._id}>
                          {company.name} ({company.type === 'group' ? 'Grup' : 'Yan Kuruluş'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Aktif Kullanıcı
                </Label>
              </div>

              {/* Permissions */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">İzinler</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canEdit"
                      checked={formData.permissions.canEdit}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, canEdit: checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="canEdit" className="cursor-pointer">
                      Düzenleme İzni
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canApprove"
                      checked={formData.permissions.canApprove}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, canApprove: checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="canApprove" className="cursor-pointer">
                      Onaylama İzni
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canDelete"
                      checked={formData.permissions.canDelete}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, canDelete: checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="canDelete" className="cursor-pointer">
                      Silme İzni
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canManageUsers"
                      checked={formData.permissions.canManageUsers}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, canManageUsers: checked as boolean },
                        })
                      }
                    />
                    <Label htmlFor="canManageUsers" className="cursor-pointer">
                      Kullanıcı Yönetimi İzni
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button type="button" variant="outline" asChild>
                  <Link href={`/dashboard/users/${user._id}`}>İptal</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}


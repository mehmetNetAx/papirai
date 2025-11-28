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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Workspace {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
}

interface UserWorkspaceAssignmentProps {
  userId: string;
  currentWorkspaces: Workspace[];
  userCompanyId: string;
}

export default function UserWorkspaceAssignment({ 
  userId, 
  currentWorkspaces,
  userCompanyId 
}: UserWorkspaceAssignmentProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(currentWorkspaces);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [workspaceToRemove, setWorkspaceToRemove] = useState<Workspace | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

  useEffect(() => {
    loadAvailableWorkspaces();
  }, [userCompanyId]);

  const loadAvailableWorkspaces = async () => {
    try {
      const response = await fetch(`/api/workspaces?companyId=${userCompanyId}`);
      if (!response.ok) {
        throw new Error('Failed to load workspaces');
      }
      const data = await response.json();
      // Filter out already assigned workspaces
      const assignedIds = new Set(workspaces.map(ws => ws.id));
      const formattedWorkspaces = (data.workspaces || []).map((ws: any) => ({
        id: ws._id?.toString() || ws.id,
        name: ws.name,
        companyId: (ws.companyId as any)?._id?.toString() || ws.companyId?.toString() || userCompanyId,
        companyName: (ws.companyId as any)?.name || '',
      }));
      setAvailableWorkspaces(formattedWorkspaces.filter((ws: Workspace) => !assignedIds.has(ws.id)));
    } catch (error) {
      console.error('Error loading workspaces:', error);
    }
  };

  const handleAddWorkspace = async () => {
    if (!selectedWorkspaceId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: {
            workspaces: [...workspaces.map(ws => ws.id), selectedWorkspaceId],
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add workspace');
      }

      const data = await response.json();
      const newWorkspace = availableWorkspaces.find(ws => ws.id === selectedWorkspaceId);
      if (newWorkspace) {
        setWorkspaces([...workspaces, newWorkspace]);
        setAvailableWorkspaces(availableWorkspaces.filter(ws => ws.id !== selectedWorkspaceId));
        setSelectedWorkspaceId('');
      }
    } catch (error) {
      console.error('Error adding workspace:', error);
      alert('Workspace eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWorkspace = async () => {
    if (!workspaceToRemove) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: {
            workspaces: workspaces.filter(ws => ws.id !== workspaceToRemove.id).map(ws => ws.id),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove workspace');
      }

      setWorkspaces(workspaces.filter(ws => ws.id !== workspaceToRemove.id));
      setAvailableWorkspaces([...availableWorkspaces, workspaceToRemove]);
      setShowRemoveDialog(false);
      setWorkspaceToRemove(null);
    } catch (error) {
      console.error('Error removing workspace:', error);
      alert('Workspace çıkarılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atanan Workspace(ler)</CardTitle>
        <CardDescription>
          Kullanıcının erişim yetkisi olan workspace'ler
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Workspace */}
        {availableWorkspaces.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Workspace seçin" />
              </SelectTrigger>
              <SelectContent>
                {availableWorkspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                    {workspace.companyName && ` (${workspace.companyName})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddWorkspace} 
              disabled={!selectedWorkspaceId || loading}
            >
              Ekle
            </Button>
          </div>
        )}

        {/* Workspaces List */}
        {workspaces.length > 0 ? (
          <div className="space-y-2">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div>
                  <div className="font-medium">{workspace.name}</div>
                  {workspace.companyName && (
                    <Badge variant="outline" className="mt-1">
                      {workspace.companyName}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setWorkspaceToRemove(workspace);
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
          <p className="text-sm text-gray-500">Henüz atanmış workspace yok</p>
        )}

        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Workspace'i Çıkar</AlertDialogTitle>
              <AlertDialogDescription>
                {workspaceToRemove?.name} workspace'ini bu kullanıcıdan çıkarmak istediğinize emin misiniz?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveWorkspace}>Çıkar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}


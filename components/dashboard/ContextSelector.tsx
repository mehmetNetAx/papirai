'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  setSelectedCompanyId,
  setSelectedWorkspaceId,
  getSelectedCompanyId,
  getSelectedWorkspaceId,
} from '@/lib/utils/context-cookie';

interface Company {
  id: string;
  name: string;
  type: string;
  parentCompanyId?: string;
}

interface Workspace {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
}

interface UserContext {
  companies: Company[];
  workspaces: Workspace[];
  defaultCompanyId: string;
}

export default function ContextSelector() {
  const router = useRouter();
  const [context, setContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    try {
      const response = await fetch('/api/user/context');
      if (!response.ok) {
        throw new Error('Failed to load context');
      }
      const data: UserContext = await response.json();
      setContext(data);

      // Get current selections from cookies
      const cookieCompany = getSelectedCompanyId();
      const cookieWorkspace = getSelectedWorkspaceId();

      // Set default company if not in cookie
      const companyId = cookieCompany || data.defaultCompanyId;
      setSelectedCompany(companyId);
      if (!cookieCompany) {
        setSelectedCompanyId(companyId);
      }

      // Set default workspace if available
      if (cookieWorkspace) {
        setSelectedWorkspace(cookieWorkspace);
      } else if (data.workspaces.length === 1) {
        // Auto-select if only one workspace
        setSelectedWorkspace(data.workspaces[0].id);
        setSelectedWorkspaceId(data.workspaces[0].id);
      }
    } catch (error) {
      console.error('Error loading context:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    setSelectedCompanyId(companyId);
    
    // Clear workspace selection if it doesn't belong to new company
    const workspacesForCompany = context?.workspaces.filter(
      (w) => w.companyId === companyId
    ) || [];
    
    if (workspacesForCompany.length === 0) {
      setSelectedWorkspace('');
      setSelectedWorkspaceId('');
    } else if (workspacesForCompany.length === 1) {
      // Auto-select if only one workspace
      setSelectedWorkspace(workspacesForCompany[0].id);
      setSelectedWorkspaceId(workspacesForCompany[0].id);
    } else {
      // Check if current workspace is still valid
      const currentWorkspace = context?.workspaces.find(
        (w) => w.id === selectedWorkspace && w.companyId === companyId
      );
      if (!currentWorkspace) {
        setSelectedWorkspace('');
        setSelectedWorkspaceId('');
      }
    }

    // Reload page to apply new context
    router.refresh();
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    setSelectedWorkspace(workspaceId);
    setSelectedWorkspaceId(workspaceId);
    
    // Reload page to apply new context
    router.refresh();
  };

  if (loading || !context) {
    return null;
  }

  // Don't show selector if user has access to only one company and one workspace
  const hasMultipleCompanies = context.companies.length > 1;
  const workspacesForSelectedCompany = context.workspaces.filter(
    (w) => w.companyId === selectedCompany
  );
  const hasMultipleWorkspaces = workspacesForSelectedCompany.length > 1;

  if (!hasMultipleCompanies && !hasMultipleWorkspaces) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {hasMultipleCompanies && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Şirket:</span>
          <Select value={selectedCompany} onValueChange={handleCompanyChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Şirket seçin" />
            </SelectTrigger>
            <SelectContent>
              {context.companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                  {company.type === 'group' && ' (Grup)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasMultipleWorkspaces && selectedCompany && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Workspace:</span>
          <Select value={selectedWorkspace} onValueChange={handleWorkspaceChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Workspace seçin" />
            </SelectTrigger>
            <SelectContent>
              {workspacesForSelectedCompany.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}


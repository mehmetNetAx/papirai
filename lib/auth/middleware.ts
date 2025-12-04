import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  getSelectedCompanyIdFromRequest,
  getSelectedWorkspaceIdFromRequest,
} from '@/lib/utils/context-cookie';
import { logRequestActivity } from '@/lib/middleware/activity-logger';

export interface AuthUser {
  id: string;
  role: string;
  companyId: string;
  groupId?: string;
  selectedCompanyId?: string;
  selectedWorkspaceId?: string;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token) {
    return null;
  }

  // Read context from cookies
  const cookies = request.headers.get('cookie') || undefined;
  const selectedCompanyId = getSelectedCompanyIdFromRequest(cookies);
  const selectedWorkspaceId = getSelectedWorkspaceIdFromRequest(cookies);

  return {
    id: token.id as string,
    role: token.role as string,
    companyId: token.companyId as string,
    groupId: token.groupId as string | undefined,
    selectedCompanyId: selectedCompanyId || undefined,
    selectedWorkspaceId: selectedWorkspaceId || undefined,
  };
}

export function requireAuth(handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Execute handler
    const response = await handler(req, user);

    // Log activity asynchronously (don't block the response)
    const pathname = new URL(req.url).pathname;
    if (pathname.startsWith('/api/')) {
      logRequestActivity(req, response, startTime).catch(err => {
        console.error('[requireAuth] Error logging activity:', err);
      });
    }

    return response;
  };
}

export function requireRole(roles: string[]) {
  return (handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      const user = await getAuthUser(req);
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!roles.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return handler(req, user);
    };
  };
}


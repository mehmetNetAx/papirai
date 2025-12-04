import { NextRequest, NextResponse } from 'next/server';
import { logUserActivity } from '@/lib/services/user-logging';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';

/**
 * Extract IP address from request
 */
function getIpAddress(req: NextRequest): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  
  return undefined;
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: NextRequest): string | undefined {
  return req.headers.get('user-agent') || undefined;
}

/**
 * Determine activity type from request
 */
function getActivityTypeFromRequest(req: NextRequest, pathname: string): 'page_view' | 'api_call' | 'navigation' {
  if (pathname.startsWith('/api/')) {
    return 'api_call';
  }
  if (pathname.startsWith('/dashboard/')) {
    return 'navigation';
  }
  return 'page_view';
}

/**
 * Determine action name from pathname
 */
function getActionFromPathname(pathname: string, method: string): string {
  // Remove query params
  const path = pathname.split('?')[0];
  
  // API routes
  if (path.startsWith('/api/')) {
    const parts = path.replace('/api/', '').split('/');
    const resource = parts[0];
    const action = parts[parts.length - 1];
    
    if (method === 'GET') {
      return `get_${resource}${action !== resource ? `_${action}` : ''}`;
    } else if (method === 'POST') {
      return `create_${resource}${action !== resource ? `_${action}` : ''}`;
    } else if (method === 'PATCH' || method === 'PUT') {
      return `update_${resource}${action !== resource ? `_${action}` : ''}`;
    } else if (method === 'DELETE') {
      return `delete_${resource}${action !== resource ? `_${action}` : ''}`;
    }
    return `api_${resource}`;
  }
  
  // Page routes
  if (path.startsWith('/dashboard/')) {
    const parts = path.replace('/dashboard/', '').split('/');
    return `view_${parts[0]}${parts[1] ? `_${parts[1]}` : ''}`;
  }
  
  return `view_${path.replace(/\//g, '_')}`;
}

/**
 * Extract resource info from pathname
 */
function getResourceInfo(pathname: string): { resourceType?: string; resourceId?: string } {
  const path = pathname.split('?')[0];
  const parts = path.split('/').filter(Boolean);
  
  // Check for common resource patterns
  const resourcePatterns = [
    { type: 'contract', pattern: /\/contracts\/([^\/]+)/ },
    { type: 'user', pattern: /\/users\/([^\/]+)/ },
    { type: 'company', pattern: /\/companies\/([^\/]+)/ },
    { type: 'document', pattern: /\/documents\/([^\/]+)/ },
    { type: 'workspace', pattern: /\/workspaces\/([^\/]+)/ },
  ];
  
  for (const { type, pattern } of resourcePatterns) {
    const match = pathname.match(pattern);
    if (match && match[1]) {
      return {
        resourceType: type,
        resourceId: match[1],
      };
    }
  }
  
  return {};
}

/**
 * Log user activity from request/response
 */
export async function logRequestActivity(
  req: NextRequest,
  res: NextResponse | null,
  startTime: number
): Promise<void> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return; // Don't log unauthenticated requests
    }
    
    const pathname = new URL(req.url).pathname;
    const method = req.method;
    const duration = Date.now() - startTime;
    
    // Skip logging for certain paths
    const skipPaths = ['/api/health', '/_next', '/favicon.ico', '/api/user/context'];
    if (skipPaths.some(path => pathname.startsWith(path))) {
      return;
    }
    
    const activityType = getActivityTypeFromRequest(req, pathname);
    const action = getActionFromPathname(pathname, method);
    const resourceInfo = getResourceInfo(pathname);
    
    // Determine log level based on status code
    let level: 'info' | 'warning' | 'error' = 'info';
    if (res) {
      const statusCode = res.status;
      if (statusCode >= 500) {
        level = 'error';
      } else if (statusCode >= 400) {
        level = 'warning';
      }
    }
    
    await logUserActivity({
      userId: user.id,
      activityType,
      level,
      action,
      resourceType: resourceInfo.resourceType,
      resourceId: resourceInfo.resourceId,
      url: pathname,
      method,
      statusCode: res?.status,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      duration,
    });
  } catch (error) {
    // Silently fail - don't break request flow
    console.error('[ActivityLogger] Error logging request:', error);
  }
}

/**
 * Log error activity
 */
export async function logErrorActivity(
  req: NextRequest,
  error: Error,
  context?: Record<string, any>
): Promise<void> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return;
    }
    
    const pathname = new URL(req.url).pathname;
    const method = req.method;
    const resourceInfo = getResourceInfo(pathname);
    
    await logUserActivity({
      userId: user.id,
      activityType: 'error',
      level: 'error',
      action: `error_${getActionFromPathname(pathname, method)}`,
      resourceType: resourceInfo.resourceType,
      resourceId: resourceInfo.resourceId,
      url: pathname,
      method,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      errorMessage: error.message,
      errorStack: error.stack,
      details: context,
    });
  } catch (logError) {
    console.error('[ActivityLogger] Error logging error activity:', logError);
  }
}

/**
 * Log login activity
 */
export async function logLoginActivity(
  userId: string,
  req: NextRequest | any | null | undefined,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    console.log(`[ActivityLogger] Attempting to log login activity for user ${userId}, success: ${success}`);
    
    // Create a minimal request object if needed
    // If req is null/undefined, create a basic request object
    const request = req instanceof NextRequest ? req : (req ? {
      url: req?.url || 'http://localhost/api/auth/signin',
      headers: {
        get: (name: string) => {
          if (name === 'x-forwarded-for') return req?.headers?.['x-forwarded-for'];
          if (name === 'x-real-ip') return req?.headers?.['x-real-ip'];
          if (name === 'user-agent') return req?.headers?.['user-agent'];
          return null;
        },
      },
    } : {
      url: 'http://localhost/api/auth/signin',
      headers: {
        get: () => null,
      },
    }) as NextRequest;
    
    console.log(`[ActivityLogger] Calling logUserActivity for user ${userId}`);
    await logUserActivity({
      userId,
      activityType: 'login',
      level: success ? 'info' : 'error',
      action: success ? 'login_success' : 'login_failed',
      url: '/api/auth/signin',
      method: 'POST',
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      errorMessage: errorMessage,
      details: { success },
    });
    console.log(`[ActivityLogger] Successfully logged login activity for user ${userId}`);
  } catch (error: any) {
    console.error('[ActivityLogger] Error logging login:', error);
    console.error('[ActivityLogger] Error stack:', error.stack);
  }
}

/**
 * Log logout activity
 */
export async function logLogoutActivity(
  userId: string,
  req: NextRequest
): Promise<void> {
  try {
    await logUserActivity({
      userId,
      activityType: 'logout',
      level: 'info',
      action: 'logout',
      url: '/api/auth/signout',
      method: 'POST',
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });
  } catch (error) {
    console.error('[ActivityLogger] Error logging logout:', error);
  }
}


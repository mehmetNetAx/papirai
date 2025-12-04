import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { logUserActivity } from '@/lib/services/user-logging';

export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const body = await req.json();
      const { url, action } = body;

      if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
      }

      // Determine activity type from URL
      let activityType: 'page_view' | 'navigation' = 'navigation';
      if (url.startsWith('/dashboard')) {
        activityType = 'navigation';
      } else {
        activityType = 'page_view';
      }

      // Determine action from URL
      const pathParts = url.split('/').filter(Boolean);
      const actionName = pathParts.length > 1 
        ? `view_${pathParts.slice(1).join('_')}`
        : 'view_dashboard';

      // Extract resource info
      let resourceType: string | undefined;
      let resourceId: string | undefined;
      
      // Check for common resource patterns
      const resourcePatterns = [
        { type: 'contract', pattern: /\/contracts\/([^\/]+)/ },
        { type: 'user', pattern: /\/users\/([^\/]+)/ },
        { type: 'company', pattern: /\/companies\/([^\/]+)/ },
        { type: 'document', pattern: /\/documents\/([^\/]+)/ },
        { type: 'workspace', pattern: /\/workspaces\/([^\/]+)/ },
      ];
      
      for (const { type, pattern } of resourcePatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          resourceType = type;
          resourceId = match[1];
          break;
        }
      }

      await logUserActivity({
        userId: user.id,
        activityType,
        level: 'info',
        action: actionName,
        resourceType,
        resourceId,
        url,
        method: 'GET',
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
      console.error('[Navigation Logger] Error logging navigation:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to log navigation' },
        { status: 500 }
      );
    }
  })(req);
}


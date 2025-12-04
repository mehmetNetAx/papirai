'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useActivityLogger() {
  const pathname = usePathname();

  useEffect(() => {
    // Only log dashboard pages
    if (!pathname.startsWith('/dashboard')) {
      return;
    }

    // Skip certain paths
    const skipPaths = ['/_next', '/favicon.ico'];
    if (skipPaths.some(path => pathname.startsWith(path))) {
      return;
    }

    // Log navigation activity
    const logNavigation = async () => {
      try {
        const response = await fetch('/api/logging/navigation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: pathname,
            action: 'navigation',
          }),
        });

        if (!response.ok) {
          console.error('[useActivityLogger] Failed to log navigation:', response.status);
        }
      } catch (error) {
        console.error('[useActivityLogger] Error logging navigation:', error);
      }
    };

    logNavigation();
  }, [pathname]);
}


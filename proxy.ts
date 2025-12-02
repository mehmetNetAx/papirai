import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Public paths that don't require authentication
  const publicPaths = ['/', '/login', '/register', '/forgot-password'];
  const isPublicPath = publicPaths.includes(path) || 
                       path.startsWith('/reset-password') ||
                       path.startsWith('/api/auth') || 
                       path.startsWith('/api/health');

  // If path is public, allow access
  if (isPublicPath) {
    // If user is authenticated and tries to access login/register, redirect to dashboard
    if (token && (path === '/login' || path === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // If path is protected and user is not authenticated, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};


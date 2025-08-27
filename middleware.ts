import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define route patterns
const authRoutes = ['/auth/login', '/auth/signup'];
const protectedRoutes = [
  '/home',
  '/account',
  '/messages',
  '/invites',
  '/search',
  '/saved',
  '/candidate',
  '/employer'
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow public assets and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.') ||
    pathname === '/' ||
    pathname === '/verify' ||
    pathname.startsWith('/verify')
  ) {
    return NextResponse.next();
  }

  try {
    // Get the session token
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const isAuthenticated = !!token;
    const userRole = token?.role as string | undefined;

    // Handle auth routes
    if (authRoutes.some(route => pathname.startsWith(route))) {
      if (isAuthenticated) {
        // Redirect authenticated users to their dashboard
        const dashboardPath = userRole === 'EMPLOYER' ? '/home/employer' : '/home/seeker';
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
      return NextResponse.next();
    }

    // Handle protected routes
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }

      // Role-based access control
      if (pathname.startsWith('/search/') || pathname.startsWith('/employer/')) {
        if (userRole !== 'EMPLOYER') {
          return NextResponse.redirect(new URL('/home/seeker', request.url));
        }
      }

      // Handle dashboard redirects
      if (pathname === '/home') {
        const dashboardPath = userRole === 'EMPLOYER' ? '/home/employer' : '/home/seeker';
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }

      return NextResponse.next();
    }

    // For other API routes, check authentication
    if (pathname.startsWith('/api/')) {
      if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
/**
 * Next.js middleware for route protection in demo-f1.
 *
 * Checks for the presence of the next-auth session cookie to gate access
 * to protected routes. Full session validation happens in server components
 * via getSession() / requireSession().
 *
 * This middleware does NOT call auth() or PrismaAdapter because Next.js
 * middleware runs in Edge Runtime, where PrismaClient is not available.
 */

import { NextResponse, type NextRequest } from 'next/server';

/**
 * Routes that do not require authentication.
 */
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/sso',
  '/mfa',
  '/404',
  '/500',
];

/**
 * Route prefixes that the middleware skips entirely.
 */
const IGNORED_PREFIXES = [
  '/api/auth', // next-auth handles its own auth
  '/_next',
  '/favicon.ico',
];

/**
 * Cookie name used by next-auth v5 (@auth/core) for database sessions.
 */
const SESSION_COOKIE = 'authjs.session-token';
const SECURE_SESSION_COOKIE = '__Secure-authjs.session-token';

function hasSessionCookie(req: NextRequest): boolean {
  return !!(req.cookies.get(SESSION_COOKIE) || req.cookies.get(SECURE_SESSION_COOKIE));
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  const hasSession = hasSessionCookie(req);

  if (isPublicRoute) {
    if (hasSession && pathname === '/login') {
      return NextResponse.redirect(new URL('/workspace', req.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

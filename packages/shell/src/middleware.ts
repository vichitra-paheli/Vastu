/**
 * Next.js middleware for route protection.
 *
 * Uses next-auth v5's `auth()` wrapper which provides `req.auth` (the session)
 * on every request. Protected routes redirect unauthenticated users to
 * /login?redirect={originalUrl} so the login page can resume navigation after
 * successful sign-in.
 */

import { auth } from './lib/auth';
import { NextResponse } from 'next/server';

/**
 * Routes that do not require authentication.
 * Matched as exact paths or paths that start with the route followed by '/'.
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
 * next-auth handles /api/auth itself; _next and static assets need no checks.
 */
const IGNORED_PREFIXES = [
  '/api/auth', // next-auth handles its own auth
  '/_next',
  '/favicon.ico',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip middleware for next-auth internals, Next.js internals, and static assets.
  if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow access to public routes without a session.
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  if (isPublicRoute) {
    // An already-authenticated user visiting /login is redirected to the workspace.
    if (req.auth && pathname === '/login') {
      return NextResponse.redirect(new URL('/workspace', req.url));
    }
    return NextResponse.next();
  }

  // Protected route — require a valid session.
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except Next.js static files and images.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

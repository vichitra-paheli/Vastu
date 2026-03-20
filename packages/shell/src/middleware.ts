/**
 * Next.js middleware for route protection.
 *
 * Checks for the presence of the next-auth session cookie to gate access
 * to protected routes. Full session validation (DB lookup, CASL permissions)
 * happens in server components via getSession() / requireSession().
 *
 * This middleware does NOT call auth() or PrismaAdapter because Next.js
 * middleware runs in Edge Runtime, where PrismaClient is not available.
 * The cookie-presence check is sufficient for routing — server components
 * reject invalid/expired sessions on the server side.
 *
 * US-102: MFA enforcement redirect.
 * When an organization requires MFA and the user hasn't configured it,
 * the session callback sets session.user.mfaPending = true. The MFA redirect
 * is enforced at the server component layer (shell layout, workspace layout)
 * because reading session data in the Edge Runtime requires Prisma which is
 * unavailable here. The /mfa route is listed in PUBLIC_ROUTES so authenticated
 * users with mfaPending can always reach the MFA setup page.
 */

import { NextResponse, type NextRequest } from 'next/server';

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

/**
 * Cookie name used by next-auth v5 (@auth/core) for database sessions
 * over HTTP. Over HTTPS this becomes `__Secure-authjs.session-token`.
 */
const SESSION_COOKIE = 'authjs.session-token';
const SECURE_SESSION_COOKIE = '__Secure-authjs.session-token';

function hasSessionCookie(req: NextRequest): boolean {
  return !!(req.cookies.get(SESSION_COOKIE) || req.cookies.get(SECURE_SESSION_COOKIE));
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for next-auth internals, Next.js internals, and static assets.
  if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow access to public routes without a session.
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  const hasSession = hasSessionCookie(req);

  if (isPublicRoute) {
    // An already-authenticated user visiting /login is redirected to the workspace.
    if (hasSession && pathname === '/login') {
      return NextResponse.redirect(new URL('/workspace', req.url));
    }
    return NextResponse.next();
  }

  // Protected route — require a session cookie.
  // Full validation (DB lookup, expiry, CASL) happens in server components.
  if (!hasSession) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except Next.js static files and images.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

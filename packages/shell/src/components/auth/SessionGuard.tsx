'use client';

/**
 * SessionGuard — Polls the session on a 60-second interval and redirects
 * to the login page with ?expired=true when the session is no longer valid.
 *
 * Mount this in any layout that requires authentication (shell, workspace).
 * Do NOT mount in the auth layout — login/register pages don't need session checks.
 *
 * Renders nothing visible; purely a side-effect component.
 *
 * Implementation note: Uses direct fetch to /api/auth/session instead of
 * next-auth's useSession hook to avoid requiring a SessionProvider in the
 * component tree. The session endpoint returns 200 with an empty object
 * when unauthenticated, so we check for the presence of user data.
 */

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { showWarning } from '@/lib/notifications';
import { t } from '@/lib/i18n';

export const SESSION_CHECK_INTERVAL_MS = 60_000;

/** Routes where session checks should be skipped to avoid redirect loops. */
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/sso',
  '/mfa',
];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return false;
    const data = (await res.json()) as Record<string, unknown>;
    // next-auth returns 200 with {} when unauthenticated.
    return Boolean(data.user);
  } catch {
    // Network error — don't redirect, let the next poll retry.
    return true;
  }
}

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isAuthRoute(pathname)) return;

    const interval = setInterval(() => {
      void checkSession().then((valid) => {
        if (!valid && !hasRedirected.current) {
          hasRedirected.current = true;
          showWarning(t('error.sessionExpired'));
          router.push('/login?expired=true');
        }
      });
    }, SESSION_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pathname, router]);

  return null;
}

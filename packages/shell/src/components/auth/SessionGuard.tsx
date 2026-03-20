'use client';

/**
 * SessionGuard — Polls the session on a 60-second interval and redirects
 * to the login page with ?expired=true when the session is no longer valid.
 *
 * Mount this in any layout that requires authentication (shell, workspace).
 * Do NOT mount in the auth layout — login/register pages don't need session checks.
 *
 * Renders nothing visible; purely a side-effect component.
 */

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { showWarning } from '@/lib/notifications';
import { t } from '@/lib/i18n';

const SESSION_CHECK_INTERVAL_MS = 60_000;

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Don't check on auth pages to avoid redirect loops.
    if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
      return;
    }

    if (status === 'unauthenticated' && !hasRedirected.current) {
      hasRedirected.current = true;
      showWarning(t('error.sessionExpired'));
      router.push('/login?expired=true');
    }
  }, [status, pathname, router]);

  useEffect(() => {
    // Don't poll on auth pages.
    if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
      return;
    }

    const interval = setInterval(() => {
      // Trigger a session refetch by dispatching a visibilitychange-like event.
      // next-auth's SessionProvider refetches on window focus by default,
      // but we also want periodic polling.
      void fetch('/api/auth/session').then((res) => {
        if (!res.ok || res.status === 401) {
          if (!hasRedirected.current) {
            hasRedirected.current = true;
            showWarning(t('error.sessionExpired'));
            router.push('/login?expired=true');
          }
        }
      });
    }, SESSION_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pathname, router]);

  return null;
}

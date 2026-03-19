'use client';

/**
 * error.tsx — Next.js error boundary page. Rendered when an unhandled error
 * occurs in the route segment or its children.
 *
 * Must be a client component — Next.js passes `error` and `reset` as props.
 * Self-contained: no shell layout, no sidebar.
 *
 * US-025 AC-2, AC-3, AC-4
 */

import { ErrorPage } from '@/components/shared/ErrorPage';
import { t } from '@/lib/i18n';

interface GlobalErrorPageProps {
  /** The error that was thrown. Provided by Next.js. */
  error: Error & { digest?: string };
  /** Call this to attempt to re-render the failed segment. Provided by Next.js. */
  reset: () => void;
}

export default function GlobalErrorPage({ reset }: GlobalErrorPageProps) {
  return (
    <ErrorPage
      statusCode={500}
      title={t('error.serverError')}
      message={t('error.serverError.message')}
      actions={[
        { label: t('error.serverError.tryAgain'), onClick: reset },
        { label: t('error.serverError.goToWorkspace'), href: '/workspace' },
      ]}
    />
  );
}

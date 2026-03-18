import type { Metadata } from 'next';
import { ErrorPage } from '../components/shared/ErrorPage';
import { t } from '../lib/i18n';

export const metadata: Metadata = {
  title: '404 — Page not found | Vastu',
};

/**
 * not-found.tsx — Rendered by Next.js for any unmatched route or when
 * `notFound()` is called from a server component.
 *
 * Self-contained: no shell layout, no sidebar. Works even if the root
 * layout throws.
 *
 * US-025 AC-1, AC-3, AC-4
 */
export default function NotFoundPage() {
  return (
    <ErrorPage
      statusCode={404}
      title={t('error.notFound')}
      message={t('error.notFound.message')}
      actions={[
        { label: t('error.notFound.goToWorkspace'), href: '/workspace' },
        { label: t('error.notFound.goBack'), href: '/' },
      ]}
    />
  );
}

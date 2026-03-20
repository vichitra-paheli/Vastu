import type { Metadata } from 'next';
import { WorkspacePlaceholder } from '@/components/workspace/WorkspacePlaceholder';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: `${t('workspace.title')} — Vastu`,
  description: t('workspace.placeholder.message'),
};

/**
 * Workspace page — /workspace
 *
 * Protected by middleware (no session → redirect to /login).
 * Phase 0 placeholder: shows an EmptyState until Phase 1 delivers Dockview.
 *
 * Note: This file lives at app/workspace/ (not inside (shell)/) so it does
 * not inherit the settings shell layout (TopBar + SideNav). Middleware
 * provides authentication protection without the shell UI chrome.
 */
export default function WorkspacePage() {
  return <WorkspacePlaceholder />;
}

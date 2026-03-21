import type { Metadata } from 'next';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: `${t('workspace.title')} — Vastu`,
  description: t('workspace.description'),
};

/**
 * Workspace page — /workspace
 *
 * Protected by middleware (no session → redirect to /login).
 * Layout is provided by WorkspaceLayout (WorkspaceProviders + WorkspaceShell).
 *
 * Phase 1A: Entry point for the workspace. Dockview and page templates
 * will be mounted here in US-107+.
 *
 * Note: This file lives at app/workspace/ (not inside (shell)/) so it does
 * not inherit the settings shell layout (TopBar + SideNav). Middleware
 * provides authentication protection without the shell UI chrome.
 */
export default function WorkspacePage() {
  return null;
}

/**
 * Workspace layout — wraps the /workspace route.
 *
 * Server component: reads session for auth check and redirects.
 * Client boundary: WorkspaceProviders and WorkspaceShell are client components
 * that provide TanStack Query and Zustand state.
 *
 * US-102: Redirects to /mfa if the user's organization requires MFA
 * but the user has not yet configured it.
 * US-103: SessionGuard polls for session expiry and redirects to /login.
 * US-106: WorkspaceProviders + WorkspaceShell replace the Phase 0 placeholder.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { SessionGuard } from '@/components/auth/SessionGuard';
import { WorkspaceProviders } from '@vastu/workspace';
import { WorkspaceShell } from '@vastu/workspace';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // US-102: If the org requires MFA and the user hasn't set it up yet,
  // redirect to the MFA setup page.
  if (session.user.mfaPending) {
    redirect('/mfa');
  }

  return (
    <WorkspaceProviders>
      <SessionGuard />
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProviders>
  );
}

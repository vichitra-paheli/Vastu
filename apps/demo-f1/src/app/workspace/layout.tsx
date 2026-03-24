/**
 * Workspace layout — wraps the /workspace route.
 *
 * Server component: reads session for auth check and redirects.
 * Client boundary: WorkspaceProviders and WorkspaceShell are client components
 * that provide TanStack Query and Zustand state.
 *
 * Redirects to /mfa if the user's organization requires MFA but the user
 * has not yet configured it.
 * SessionGuard polls for session expiry and redirects to /login.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { SessionGuard } from '@/components/auth/SessionGuard';
import { WorkspaceProviders } from '@vastu/workspace';
import { WorkspaceShell } from '@vastu/workspace';

// Side-effect imports — register F1 pages and formatters before render.
import '../../pages';
import '../../formatters';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

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

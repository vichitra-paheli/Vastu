/**
 * Workspace layout — wraps the /workspace route.
 *
 * Server component: reads session for auth check.
 *
 * US-102: Redirects to /mfa if the user's organization requires MFA
 * but the user has not yet configured it.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { IconRail } from '@/components/workspace/IconRail';
import classes from './layout.module.css';

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
    <div className={classes.container}>
      <IconRail />
      <main className={classes.main}>{children}</main>
    </div>
  );
}

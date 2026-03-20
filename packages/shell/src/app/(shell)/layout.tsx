/**
 * Shell layout — wraps all settings and admin pages.
 *
 * Provides:
 * - TopBar with user info and breadcrumb
 * - SideNav with settings/admin navigation (admin section CASL-gated)
 * - Scrollable content area
 *
 * Server component: reads session on the server. Redirects to /login if
 * the user is not authenticated (middleware handles this, but we add a
 * defensive check here as well).
 */

import { redirect } from 'next/navigation';
import { getSessionWithAbility } from '@/lib/session';
import { isAdmin } from '@vastu/shared/permissions';
import { TopBar } from '@/components/shell/TopBar';
import { SideNav } from '@/components/shell/SideNav';
import classes from '@/components/shell/ShellLayout.module.css';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const { session, ability } = await getSessionWithAbility();

  if (!session) {
    redirect('/login');
  }

  const userName = session.user.name ?? 'User';
  const userEmail = session.user.email ?? '';
  const primaryRole = session.user.roles[0]?.name ?? 'viewer';
  const userIsAdmin = ability ? isAdmin(ability) : false;

  return (
    <div className={classes.shell}>
      <TopBar
        userName={userName}
        userEmail={userEmail}
        userRole={primaryRole}
      />
      <div className={classes.body}>
        <SideNav isAdmin={userIsAdmin} />
        <main className={classes.content} id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

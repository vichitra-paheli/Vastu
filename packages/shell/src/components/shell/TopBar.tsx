/**
 * TopBar — Shell layout top navigation bar.
 *
 * Contains:
 * - Vastu logo (links to /workspace)
 * - "← Back to workspace" link
 * - Breadcrumb (dynamic from route, client component)
 * - UserMenu (avatar dropdown, client component)
 *
 * Server component wrapper — individual interactive sub-components are client components.
 */

import Link from 'next/link';
import { t } from '../../lib/i18n';
import { Breadcrumb } from './Breadcrumb';
import { UserMenu } from './UserMenu';
import classes from './TopBar.module.css';

export interface TopBarProps {
  userName: string;
  userEmail: string;
  userRole: string;
}

export function TopBar({ userName, userEmail, userRole }: TopBarProps) {
  return (
    <header className={classes.topBar}>
      {/* Logo — links to workspace */}
      <Link href="/workspace" className={classes.logo} aria-label="Vastu — back to workspace">
        Vastu
      </Link>

      {/* Separator */}
      <div className={classes.divider} aria-hidden="true" />

      {/* Back to workspace link */}
      <Link href="/workspace" className={classes.backLink}>
        {t('common.backToWorkspace')}
      </Link>

      {/* Separator */}
      <div className={classes.divider} aria-hidden="true" />

      {/* Breadcrumb — client component, reads pathname */}
      <div className={classes.breadcrumbArea}>
        <Breadcrumb />
      </div>

      {/* User menu — client component, needs signOut and interactivity */}
      <div className={classes.userMenuArea}>
        <UserMenu name={userName} email={userEmail} role={userRole} />
      </div>
    </header>
  );
}

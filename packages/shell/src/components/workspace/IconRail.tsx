'use client';

/**
 * IconRail — 48px collapsed sidebar for the workspace layout.
 *
 * Contains:
 * - Vastu logo mark at the top (links to /workspace)
 * - Settings icon at the bottom (links to /settings)
 *
 * All colors via --v-* tokens. No hardcoded hex values.
 * Uses Next.js Link for internal navigation.
 */

import { IconSettings } from '@tabler/icons-react';
import Link from 'next/link';
import { t } from '../../lib/i18n';
import classes from './IconRail.module.css';

export function IconRail() {
  return (
    <nav className={classes.rail} aria-label={t('workspace.iconRail.label')}>
      <div className={classes.top}>
        <Link
          href="/workspace"
          className={classes.logoMark}
          aria-label={t('workspace.iconRail.logoLabel')}
        >
          V
        </Link>
      </div>

      <div className={classes.bottom}>
        <Link
          href="/settings"
          className={classes.iconButton}
          aria-label={t('workspace.iconRail.settingsLabel')}
        >
          <IconSettings size={20} stroke={1.5} aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}

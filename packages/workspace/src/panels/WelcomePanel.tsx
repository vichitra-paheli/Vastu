'use client';

/**
 * WelcomePanel — shown when no panels are open in the workspace.
 *
 * Renders a centered empty state message guiding the user to open
 * a page from the sidebar or use the ⌘K command palette.
 *
 * All colors via --v-* CSS custom properties.
 * All strings through t('key') per i18n conventions.
 */

import React from 'react';
import { t } from '../lib/i18n';
import classes from './WelcomePanel.module.css';

/** Panel type ID — used to register this panel in the registry. */
export const WELCOME_PANEL_TYPE_ID = 'welcome';

export function WelcomePanel() {
  return (
    <div className={classes.container} aria-label={t('workspace.welcome.ariaLabel')}>
      <div className={classes.content}>
        <p className={classes.title}>{t('workspace.welcome.title')}</p>
        <p className={classes.hint}>{t('workspace.welcome.hint')}</p>
      </div>
    </div>
  );
}

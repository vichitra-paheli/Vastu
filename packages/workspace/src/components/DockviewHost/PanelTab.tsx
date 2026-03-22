'use client';

/**
 * PanelTab — custom tab renderer for Dockview panels.
 *
 * Shows the panel title with a close button (IconX at --v-icon-xs).
 * Active tab is highlighted with --v-accent-primary bottom border (applied via CSS).
 *
 * In US-120: ModeSwitch is rendered inline in the tab when there are multiple
 * modes available for the current user. The switch is only shown when the user
 * has builder or admin capabilities (otherwise it would only contain Editor,
 * and ModeSwitch renders null in that case).
 *
 * All colors via --v-* CSS custom properties.
 * All strings via t('key').
 */

import React, { useCallback, useSyncExternalStore } from 'react';
import type { IDockviewPanelHeaderProps } from 'dockview-react';
import { IconX } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../TruncatedText';
import { ModeSwitch } from '../ModeSwitch';
import classes from './PanelTab.module.css';

export function PanelTab({ api }: IDockviewPanelHeaderProps) {
  // Use useSyncExternalStore to subscribe to Dockview's event-based state.
  // This avoids setState-in-effect lint errors and handles tab recycling correctly.
  const title = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        const sub = api.onDidTitleChange(onStoreChange);
        return () => sub.dispose();
      },
      [api],
    ),
    () => api.title ?? '',
  );

  const isActive = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        const sub = api.onDidActiveChange(onStoreChange);
        return () => sub.dispose();
      },
      [api],
    ),
    () => api.isActive,
  );

  function handleClose(e: React.MouseEvent) {
    // Stop propagation so the click doesn't also activate/focus the panel
    e.stopPropagation();
    api.close();
  }

  return (
    <div className={classes.tab} role="tab" aria-selected={isActive}>
      <TruncatedText className={classes.title} maxWidth={160}>
        {title}
      </TruncatedText>
      {/* ModeSwitch renders null when user only has Editor access (no builder/admin).
          TODO(VASTU-1B-INFRA): wire ephemeralEnabled from panel config/page metadata
          once the template infrastructure provides page config. Until then,
          ephemeralEnabled defaults to false, so the Workflow segment is hidden for
          all panels regardless of user role. */}
      <ModeSwitch panelId={api.id} />
      <button
        type="button"
        className={classes.closeButton}
        onClick={handleClose}
        aria-label={t('workspace.panel.closeAriaLabel')}
        tabIndex={-1}
      >
        <IconX size="var(--v-icon-xs)" stroke={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}

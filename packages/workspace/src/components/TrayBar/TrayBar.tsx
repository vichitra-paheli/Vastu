'use client';

/**
 * TrayBar — bottom tray bar showing minimized panels and status indicators.
 *
 * Layout:
 *   [ minimized panel chips ... ]  [ status area (right) ]
 *
 * The outer 44px container lives in WorkspaceShell.module.css (.tray).
 * TrayBar fills that container with its internal two-region layout.
 *
 * - Left region: TrayItem chips for each minimized panel.
 * - Right region: Status indicators placeholder (populated in future phases).
 * - When no panels are minimized, shows a subtle empty state hint.
 *
 * Clicking a TrayItem restores the panel via panelStore.restorePanel.
 * Right-clicking (or using the context menu) offers a "Close" action that
 * permanently removes the panel via trayStore.removeFromTray.
 *
 * All strings via t('key'). All colors via --v-* tokens.
 *
 * Implements US-115 (AC-1 through AC-8).
 */

import React from 'react';
import { t } from '../../lib/i18n';
import { useTrayStore } from '../../stores/trayStore';
import { usePanelStore } from '../../stores/panelStore';
import { TrayItem } from './TrayItem';
import classes from './TrayBar.module.css';

export function TrayBar() {
  const trayItems = useTrayStore((state) => state.trayItems);
  const restorePanel = usePanelStore((state) => state.restorePanel);
  const removeFromTray = useTrayStore((state) => state.removeFromTray);

  function handleRestore(panelId: string) {
    restorePanel(panelId);
  }

  function handleClose(panelId: string) {
    removeFromTray(panelId);
  }

  return (
    <div className={classes.trayBar}>
      {/* Left: minimized panel chips */}
      <div className={classes.panelList} role="list" aria-label={t('tray.bar.panelListAriaLabel')}>
        {trayItems.length === 0 ? (
          <span className={classes.emptyHint} aria-live="polite">
            {t('tray.bar.empty')}
          </span>
        ) : (
          trayItems.map((item) => (
            <div key={item.panelId} role="listitem">
              <TrayItem item={item} onRestore={handleRestore} onClose={handleClose} />
            </div>
          ))
        )}
      </div>

      {/* Right: status indicators (placeholder for future phases) */}
      <div
        className={classes.statusArea}
        aria-label={t('tray.bar.statusAreaAriaLabel')}
        role="status"
      >
        <span className={classes.statusDot} aria-hidden="true" />
      </div>
    </div>
  );
}

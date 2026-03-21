'use client';

/**
 * PanelTab — custom tab renderer for Dockview panels.
 *
 * Shows the panel title with a close button (IconX at --v-icon-xs).
 * Active tab is highlighted with --v-accent-primary bottom border (applied via CSS).
 *
 * All colors via --v-* CSS custom properties.
 * All strings via t('key').
 */

import React, { useEffect, useRef, useState } from 'react';
import type { IDockviewPanelHeaderProps } from 'dockview-react';
import { IconX } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../TruncatedText';
import classes from './PanelTab.module.css';

export function PanelTab({ api }: IDockviewPanelHeaderProps) {
  // Track the latest API reference to detect when a different panel is mounted
  const apiRef = useRef(api);
  // Initialize title from the current API state at the time of first render
  const [title, setTitle] = useState<string>(() => api.title ?? '');

  useEffect(() => {
    // When the api prop changes identity (different panel reuses this tab slot),
    // update the title to reflect the new panel.
    if (apiRef.current !== api) {
      apiRef.current = api;
    }

    // Subscribe to title change events from Dockview (e.g. after api.setTitle())
    const subscription = api.onDidTitleChange((event) => {
      setTitle(event.title);
    });

    return () => subscription.dispose();
  }, [api]);

  function handleClose(e: React.MouseEvent) {
    // Stop propagation so the click doesn't also activate/focus the panel
    e.stopPropagation();
    api.close();
  }

  return (
    <div className={classes.tab} role="tab">
      <TruncatedText className={classes.title} maxWidth={160}>
        {title}
      </TruncatedText>
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

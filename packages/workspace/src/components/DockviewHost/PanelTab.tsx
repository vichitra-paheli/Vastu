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
  // Derive title and active state from the current api prop.
  // When Dockview recycles this tab with a different panel, the api prop changes
  // and React re-renders with the new panel's title.
  const [title, setTitle] = useState<string>(api.title ?? '');
  const [isActive, setIsActive] = useState<boolean>(api.isActive);

  // Sync title and active state when api identity changes (tab recycling).
  const apiRef = useRef(api);
  if (apiRef.current !== api) {
    apiRef.current = api;
    setTitle(api.title ?? '');
    setIsActive(api.isActive);
  }

  useEffect(() => {
    // Subscribe to title change events from Dockview (e.g. after api.setTitle())
    const titleSub = api.onDidTitleChange((event) => {
      setTitle(event.title);
    });

    // Track active state for aria-selected
    const activeSub = api.onDidActiveChange(() => {
      setIsActive(api.isActive);
    });

    return () => {
      titleSub.dispose();
      activeSub.dispose();
    };
  }, [api]);

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

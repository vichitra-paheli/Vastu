'use client';

/**
 * PanelBreadcrumb — "← Back to {source page}" link shown in target panels.
 *
 * When a panel is opened via cross-page navigation (from a LinkCell click),
 * this component appears above the panel content to provide a visual path
 * back to the source page.
 *
 * Clicking "Back" closes the current panel and focuses the source panel.
 *
 * Design system:
 *   - Breadcrumbs: Style Guide SS9.1 (Mantine Breadcrumbs component)
 *   - Link color: --v-accent-primary
 *   - Font size: --v-text-sm
 *   - Background: --v-bg-secondary (subtle row above content)
 *
 * Implements US-209b (VASTU-2A-209).
 */

import React, { useCallback } from 'react';
import { IconChevronLeft } from '@tabler/icons-react';
import { usePanelStore } from '../../stores/panelStore';
import { t } from '../../lib/i18n';
import classes from './PanelBreadcrumb.module.css';

export interface PanelBreadcrumbProps {
  /** The panel instance ID of the panel showing this breadcrumb. */
  panelId: string;
  /** The page ID of the source page to navigate back to. */
  sourcePageId: string;
  /** The display name of the source page. */
  sourcePageName: string;
}

export function PanelBreadcrumb({
  panelId,
  sourcePageId,
  sourcePageName,
}: PanelBreadcrumbProps): React.ReactElement {
  const focusPanel = usePanelStore((s) => s.focusPanel);
  const closePanel = usePanelStore((s) => s.closePanel);
  const openPanelIds = usePanelStore((s) => s.openPanelIds);

  const handleBack = useCallback(() => {
    const sourceIsOpen = openPanelIds.includes(sourcePageId);
    if (sourceIsOpen) {
      // Focus the source panel
      focusPanel(sourcePageId);
    }
    // Close the current panel (target)
    closePanel(panelId);
  }, [focusPanel, closePanel, openPanelIds, panelId, sourcePageId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleBack();
      }
    },
    [handleBack],
  );

  return (
    <div className={classes.breadcrumb} role="navigation" aria-label={t('navigation.breadcrumb.ariaLabel')}>
      <button
        type="button"
        className={classes.backLink}
        onClick={handleBack}
        onKeyDown={handleKeyDown}
        aria-label={t('navigation.breadcrumb.backAriaLabel', { page: sourcePageName })}
      >
        <IconChevronLeft
          size={12}
          stroke={2}
          aria-hidden="true"
          className={classes.backIcon}
        />
        <span className={classes.backLabel}>
          {t('navigation.breadcrumb.back', { page: sourcePageName })}
        </span>
      </button>
    </div>
  );
}

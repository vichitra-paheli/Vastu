'use client';

/**
 * LinkCell — navigable cell renderer for cross-page navigation.
 *
 * Renders a clickable link in a table cell that opens another workspace page.
 * Implements the navigateTo column config from US-209 (AC-1 through AC-7).
 *
 * Behavior:
 *   - Left-click: open target page with record context (AC-2)
 *   - ⌘/Ctrl+Click: open in a new split panel (AC-3)
 *   - Enter on focused link: trigger navigation (AC-5)
 *   - Hover with unknown pageId: tooltip "Page not configured" (AC-7)
 *   - Null/undefined cell value: renders as plain text (disabled link)
 *   - Right-click: context menu with "Open", "Open in new panel", "Copy link" (AC-6)
 *
 * Design system:
 *   - Link color: --v-accent-primary (Style Guide SS1.2)
 *   - Underline on hover (Style Guide SS1.2)
 *   - Font weight 400 (never 600 or 700)
 *
 * Implements US-209a, US-209d (VASTU-2A-209).
 */

import React, { useCallback } from 'react';
import { Tooltip } from '@mantine/core';
import { TruncatedText } from '../TruncatedText';
import { useNavigateToPage } from '../../navigation/useNavigateToPage';
import { t } from '../../lib/i18n';
import type { NavigateTo } from './types';
import classes from './LinkCell.module.css';

export type { NavigateTo };

export interface LinkCellProps {
  /** The raw cell value. */
  value: unknown;
  /** The navigateTo config from the column definition. */
  navigateTo: NavigateTo;
  /** The source page ID (for breadcrumb back-link). */
  sourcePageId?: string;
  /** The source page display name (for breadcrumb label). */
  sourcePageName?: string;
}

/**
 * Replace '{value}' placeholder in the recordId template with the cell value.
 * Returns null if value is null/undefined.
 */
function resolveRecordId(template: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return template.replace('{value}', String(value));
}

export function LinkCell({
  value,
  navigateTo,
  sourcePageId,
  sourcePageName,
}: LinkCellProps): React.ReactElement {
  const { navigateToPage, isPageRegistered } = useNavigateToPage();

  const resolvedRecordId = resolveRecordId(navigateTo.recordId, value);
  const pageExists = isPageRegistered(navigateTo.pageId);
  const displayText = value !== null && value !== undefined ? String(value) : '';

  const handleNavigation = useCallback(
    (forceNewPanel = false) => {
      if (!resolvedRecordId || !pageExists) return;
      navigateToPage(
        {
          targetPageId: navigateTo.pageId,
          recordId: resolvedRecordId,
          sourcePageId,
          sourcePageName,
        },
        forceNewPanel,
      );
    },
    [navigateToPage, navigateTo.pageId, resolvedRecordId, pageExists, sourcePageId, sourcePageName],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const forceNewPanel = e.metaKey || e.ctrlKey;
      handleNavigation(forceNewPanel);
    },
    [handleNavigation],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNavigation(false);
      }
    },
    [handleNavigation],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Propagate to parent VastuTableCell which manages the context menu.
      // The context menu data attributes are set on the parent td.
      // We prevent default here only for non-registered pages (no-op context).
      if (!pageExists) {
        e.preventDefault();
      }
    },
    [pageExists],
  );

  // When cell value is null or page doesn't exist: render as plain text with optional tooltip.
  if (!resolvedRecordId) {
    return (
      <TruncatedText>
        {displayText}
      </TruncatedText>
    );
  }

  if (!pageExists) {
    return (
      <Tooltip
        label={t('navigation.link.pageNotConfigured')}
        position="top"
        openDelay={400}
        styles={{
          tooltip: {
            background: 'var(--v-bg-elevated)',
            boxShadow: 'var(--v-shadow-sm)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-text-primary)',
            border: '1px solid var(--v-border-default)',
          },
        }}
      >
        <span className={classes.linkDisabled} aria-label={displayText}>
          <TruncatedText>{displayText}</TruncatedText>
        </span>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      className={classes.link}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      aria-label={t('navigation.link.ariaLabel', { value: displayText, page: navigateTo.pageId })}
      data-navigate-to={navigateTo.pageId}
      data-record-id={resolvedRecordId}
    >
      <TruncatedText>{displayText}</TruncatedText>
    </button>
  );
}

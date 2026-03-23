'use client';

/**
 * SSEStatusIndicator — visual connection status dot in the tray bar.
 *
 * Reads the current SSE connection status from sseConnectionStore and
 * renders a colored dot:
 * - Green  (--v-status-success)  → connected
 * - Amber  (--v-status-warning)  → connecting / reconnecting
 * - Red    (--v-status-error)    → disconnected
 *
 * The dot is wrapped in a tooltip (title attribute) so that keyboard and
 * pointer users can discover the connection status without needing to expose
 * a label in the space-constrained tray bar.
 *
 * All colors are applied via CSS data-status attribute selectors using
 * --v-* tokens in SSEStatusIndicator.module.css — no hardcoded hex values.
 *
 * Implements US-207 AC-8.
 */

import React from 'react';
import { useSSEConnectionStore } from '../../stores/sseConnectionStore';
import type { SSEConnectionStatus } from '../../stores/sseConnectionStore';
import { t } from '../../lib/i18n';
import classes from './SSEStatusIndicator.module.css';

/** Maps connection status to its i18n key for the tooltip. */
const STATUS_LABEL_KEY: Record<SSEConnectionStatus, string> = {
  connected: 'sse.status.connected',
  connecting: 'sse.status.connecting',
  disconnected: 'sse.status.disconnected',
};

/** Maps connection status to its aria-label i18n key. */
const STATUS_ARIA_KEY: Record<SSEConnectionStatus, string> = {
  connected: 'sse.status.connected.aria',
  connecting: 'sse.status.connecting.aria',
  disconnected: 'sse.status.disconnected.aria',
};

export interface SSEStatusIndicatorProps {
  /** When true, renders a short text label beside the dot. Defaults to false. */
  showLabel?: boolean;
}

export function SSEStatusIndicator({ showLabel = false }: SSEStatusIndicatorProps) {
  const status = useSSEConnectionStore((s) => s.status);
  const label = t(STATUS_LABEL_KEY[status]);
  const ariaLabel = t(STATUS_ARIA_KEY[status]);

  return (
    <span
      className={classes.indicator}
      title={label}
      aria-label={ariaLabel}
      data-testid="sse-status-indicator"
    >
      <span
        className={classes.dot}
        data-status={status}
        aria-hidden="true"
        data-testid="sse-status-dot"
      />
      {showLabel && (
        <span className={classes.label} data-testid="sse-status-label">
          {label}
        </span>
      )}
    </span>
  );
}

'use client';

/**
 * SSEStatusIndicator — a coloured dot showing the SSE connection state.
 *
 * | State        | Colour | Token                   | Meaning                 |
 * |--------------|--------|-------------------------|-------------------------|
 * | connected    | green  | --v-status-success      | Live updates active     |
 * | connecting   | amber  | --v-status-warning      | Reconnecting (pulses)   |
 * | disconnected | red    | --v-status-error        | Updates unavailable     |
 *
 * Provides a Tooltip (via `title` attribute) for mouse users, and an
 * aria-label for screen readers, so the state is not communicated by
 * colour alone.
 *
 * Implements US-207 AC-10.
 */

import React from 'react';
import type { SSEConnectionState } from '../../hooks/useWorkspaceEvents';
import { t } from '../../lib/i18n';
import classes from './SSEStatusIndicator.module.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SSEStatusIndicatorProps {
  /** Current connection state from useWorkspaceEvents. */
  state: SSEConnectionState;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SSEStatusIndicator({ state }: SSEStatusIndicatorProps) {
  const dotClass = {
    connected: classes['dot--connected'],
    connecting: classes['dot--connecting'],
    disconnected: classes['dot--disconnected'],
  }[state];

  const label = {
    connected: t('sse.status.connected'),
    connecting: t('sse.status.connecting'),
    disconnected: t('sse.status.disconnected'),
  }[state];

  return (
    <span
      className={classes.indicator}
      role="status"
      aria-label={label}
      title={label}
      data-testid="sse-status-indicator"
      data-state={state}
    >
      <span className={`${classes.dot} ${dotClass}`} aria-hidden="true" />
    </span>
  );
}

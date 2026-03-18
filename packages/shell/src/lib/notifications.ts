/**
 * Vastu toast notification helpers
 *
 * Wraps @mantine/notifications with Vastu design system conventions:
 * - Position: bottom-right (configured on <Notifications> in layout)
 * - Max 3 visible at once (configured on <Notifications> in layout)
 * - Type-specific icons and colors using --v-status-* and --v-accent-* tokens
 * - Auto-dismiss timers per type (see patterns library §10.1)
 *
 * Color mapping follows patterns library §10.1:
 *   success  → --v-status-success  (green, 5000ms)
 *   error    → --v-status-error    (red, persistent — manual dismiss)
 *   warning  → --v-accent-tertiary (goldenrod, 8000ms)
 *   info     → --v-accent-primary  (steel blue, 5000ms)
 */

import React from 'react';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';

const ICON_SIZE = 20; // --v-icon-md

/**
 * Show a success toast. Auto-dismisses after 5000ms.
 * Use for: save confirmations, completed operations, positive outcomes.
 */
export function showSuccess(message: string, title?: string): void {
  notifications.show({
    title,
    message,
    color: 'green',
    icon: React.createElement(IconCheck, { size: ICON_SIZE }),
    autoClose: 5000,
    style: { '--notification-color': 'var(--v-status-success)' } as React.CSSProperties,
  });
}

/**
 * Show an error toast. Persistent — user must manually dismiss.
 * Use for: failed operations, server errors, validation failures.
 */
export function showError(message: string, title?: string): void {
  notifications.show({
    title,
    message,
    color: 'red',
    icon: React.createElement(IconAlertCircle, { size: ICON_SIZE }),
    autoClose: false,
    style: { '--notification-color': 'var(--v-status-error)' } as React.CSSProperties,
  });
}

/**
 * Show a warning toast. Auto-dismisses after 8000ms.
 * Use for: approaching limits, non-critical issues, cautions.
 */
export function showWarning(message: string, title?: string): void {
  notifications.show({
    title,
    message,
    color: 'yellow',
    icon: React.createElement(IconAlertTriangle, { size: ICON_SIZE }),
    autoClose: 8000,
    style: { '--notification-color': 'var(--v-accent-tertiary)' } as React.CSSProperties,
  });
}

/**
 * Show an info toast. Auto-dismisses after 5000ms.
 * Use for: background operations started, informational status updates.
 */
export function showInfo(message: string, title?: string): void {
  notifications.show({
    title,
    message,
    color: 'blue',
    icon: React.createElement(IconInfoCircle, { size: ICON_SIZE }),
    autoClose: 5000,
    style: { '--notification-color': 'var(--v-accent-primary)' } as React.CSSProperties,
  });
}

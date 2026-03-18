'use client';

/**
 * AuditLogRow — A single row in the audit log table.
 *
 * Displays:
 *   - Timestamp in monospace (--v-font-mono)
 *   - User name
 *   - Action badge (color-coded per action type)
 *   - Resource description
 *
 * Action badge colors:
 *   Create  = green
 *   Update  = blue
 *   Delete  = red
 *   Login   = slate / gray
 *   Export  = slate / gray
 *
 * Clicking the row opens the AuditDetailDrawer.
 *
 * All strings via t(). All colors via --v-* tokens.
 */

import { Badge, Table, Text } from '@mantine/core';
import type { AuditEvent } from '@vastu/shared/types';
import { formatTimestamp } from '@vastu/shared/utils';
import { t } from '../../lib/i18n';

// ---------------------------------------------------------------------------
// Badge colour map
// ---------------------------------------------------------------------------

type ActionColor = 'green' | 'blue' | 'red' | 'gray';

const ACTION_COLORS: Record<string, ActionColor> = {
  Create: 'green',
  Update: 'blue',
  Delete: 'red',
  Login: 'gray',
  Export: 'gray',
};

function actionColor(action: string): ActionColor {
  // Normalise to title-case for lookup
  const key = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
  return ACTION_COLORS[key] ?? 'gray';
}

function actionLabel(action: string): string {
  const key = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
  const translationKey = `auditLog.action.${key.toLowerCase()}`;
  const translated = t(translationKey);
  // If no translation found, fall back to the raw action value
  return translated === translationKey ? action : translated;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AuditLogRowProps {
  event: AuditEvent;
  onClick: (event: AuditEvent) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditLogRow({ event, onClick }: AuditLogRowProps) {
  const color = actionColor(event.action);
  const label = actionLabel(event.action);

  return (
    <Table.Tr
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(event)}
    >
      {/* Timestamp — monospace */}
      <Table.Td>
        <Text
          fz="var(--v-text-sm)"
          style={{
            fontFamily: 'var(--v-font-mono)',
            color: 'var(--v-text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatTimestamp(event.createdAt)}
        </Text>
      </Table.Td>

      {/* User name */}
      <Table.Td>
        <Text fz="var(--v-text-sm)" c="var(--v-text-primary)">
          {event.userName ?? '—'}
        </Text>
      </Table.Td>

      {/* Action badge */}
      <Table.Td>
        <Badge color={color} variant="light" size="sm">
          {label}
        </Badge>
      </Table.Td>

      {/* Resource description */}
      <Table.Td>
        <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
          {event.resourceDescription ?? `${event.resourceType}${event.resourceId ? ` #${event.resourceId}` : ''}`}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

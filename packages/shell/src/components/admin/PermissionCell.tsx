'use client';

/**
 * PermissionCell — A set of CRUD badge buttons for a single resource/role cell.
 *
 * Displays up to four badge-style buttons:
 *   V = View (read)
 *   E = Edit (update)
 *   D = Delete (delete)
 *   X = Export (export)
 *
 * Color coding:
 *   Granted     → --v-status-success  (green)
 *   Denied      → --v-bg-tertiary     (gray)
 *   Conditional → --v-accent-tertiary (amber) + tooltip showing scope
 *
 * System role cells are read-only (no click handler rendered).
 * Custom role cells toggle on click.
 *
 * Design System: Style Guide §2 (Typography), §4 (Colors)
 */

import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { t } from '@/lib/i18n';

// The four CRUD actions shown as badges
export const BADGE_ACTIONS = ['read', 'update', 'delete', 'export'] as const;
export type BadgeAction = (typeof BADGE_ACTIONS)[number];

export const ACTION_LABELS: Record<BadgeAction, string> = {
  read: 'V',
  update: 'E',
  delete: 'D',
  export: 'X',
};

export const ACTION_ARIA_LABELS: Record<BadgeAction, string> = {
  read: t('permissions.action.read'),
  update: t('permissions.action.update'),
  delete: t('permissions.action.delete'),
  export: t('permissions.action.export'),
};

export interface CellPermission {
  action: string;
  granted: boolean;
  /** If set, this permission has conditions (rendered in amber with tooltip). */
  conditions?: Record<string, unknown> | null;
}

export interface PermissionCellProps {
  /** Permissions for all actions in this cell. */
  permissions: CellPermission[];
  /** Whether this role is a system role (read-only). */
  isSystem: boolean;
  /** Called when a badge is toggled (custom roles only). */
  onToggle?: (action: BadgeAction, currentlyGranted: boolean) => void;
}

function getPermission(permissions: CellPermission[], action: BadgeAction): CellPermission | undefined {
  return permissions.find((p) => p.action === action);
}

function BadgeButton({
  label,
  ariaLabel,
  granted,
  hasConditions,
  conditionsLabel,
  isSystem,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  granted: boolean;
  hasConditions: boolean;
  conditionsLabel: string;
  isSystem: boolean;
  onClick?: () => void;
}) {
  const color = hasConditions
    ? 'var(--v-accent-tertiary)'
    : granted
      ? 'var(--v-status-success)'
      : 'var(--v-bg-tertiary)';

  const textColor = hasConditions || granted ? 'var(--v-text-inverse)' : 'var(--v-text-tertiary)';

  const button = (
    <ActionIcon
      size="xs"
      radius="sm"
      variant="filled"
      aria-label={ariaLabel}
      onClick={!isSystem && onClick ? onClick : undefined}
      style={{
        backgroundColor: color,
        color: textColor,
        cursor: isSystem ? 'default' : 'pointer',
        width: 20,
        height: 20,
        minWidth: 20,
        fontSize: 'var(--v-text-xs)',
        fontWeight: 500,
      }}
    >
      {label}
    </ActionIcon>
  );

  if (hasConditions) {
    return (
      <Tooltip label={conditionsLabel} withArrow position="top">
        {button}
      </Tooltip>
    );
  }

  return button;
}

export function PermissionCell({ permissions, isSystem, onToggle }: PermissionCellProps) {
  return (
    <Group gap={4} wrap="nowrap" justify="center">
      {BADGE_ACTIONS.map((action) => {
        const perm = getPermission(permissions, action);
        const granted = perm?.granted ?? false;
        const hasConditions = !!(perm?.conditions && Object.keys(perm.conditions).length > 0);
        const conditionsLabel = hasConditions
          ? t('permissions.cell.conditionTooltip').replace(
              '{scope}',
              JSON.stringify(perm!.conditions),
            )
          : '';

        return (
          <BadgeButton
            key={action}
            label={ACTION_LABELS[action]}
            ariaLabel={`${ACTION_ARIA_LABELS[action]}: ${granted ? t('permissions.cell.granted') : t('permissions.cell.denied')}`}
            granted={granted}
            hasConditions={hasConditions}
            conditionsLabel={conditionsLabel}
            isSystem={isSystem}
            onClick={
              onToggle
                ? () => {
                    onToggle(action, granted);
                  }
                : undefined
            }
          />
        );
      })}
    </Group>
  );
}

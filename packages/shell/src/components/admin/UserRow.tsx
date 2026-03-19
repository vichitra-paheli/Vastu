'use client';

/**
 * UserRow — Single row in the admin user management table.
 *
 * Renders: avatar + name, email, role badge, status indicator.
 * Clicking the row opens the EditUserDrawer.
 *
 * Role badge colors (Style Guide §8.3):
 *   Admin   → --v-accent-primary  (steel blue)
 *   Builder → --v-accent-secondary
 *   Editor  → --v-status-success  (green)
 *   Viewer  → --v-text-tertiary   (neutral/gray)
 *   Custom  → --v-text-tertiary
 *
 * Status dot colors:
 *   Active      → --v-status-success  (green)
 *   Pending     → --v-text-tertiary   (gray)
 *   Deactivated → --v-status-error    (red)
 */

import { Avatar, Badge, Box, Group, Table, Text, Tooltip } from '@mantine/core';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../shared/TruncatedText';
import type { UserListItem } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserRowProps {
  user: UserListItem;
  onClick: (user: UserListItem) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRoleBadgeColor(roleName: string): string {
  switch (roleName.toLowerCase()) {
    case 'admin':
      return 'var(--v-accent-primary)';
    case 'builder':
      return 'var(--v-accent-secondary)';
    case 'editor':
      return 'var(--v-status-success)';
    default:
      return 'var(--v-text-tertiary)';
  }
}

function getUserStatus(user: UserListItem): 'active' | 'pending' | 'deactivated' {
  if (user.deletedAt !== null) return 'deactivated';
  if (!user.emailVerified) return 'pending';
  return 'active';
}

function getStatusDotColor(status: 'active' | 'pending' | 'deactivated'): string {
  switch (status) {
    case 'active':
      return 'var(--v-status-success)';
    case 'pending':
      return 'var(--v-text-tertiary)';
    case 'deactivated':
      return 'var(--v-status-error)';
  }
}

function getStatusLabel(status: 'active' | 'pending' | 'deactivated'): string {
  switch (status) {
    case 'active':
      return t('users.status.active');
    case 'pending':
      return t('users.status.pending');
    case 'deactivated':
      return t('users.status.deactivated');
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserRow({ user, onClick }: UserRowProps) {
  const status = getUserStatus(user);
  const primaryRole = user.roles[0];
  const statusDotColor = getStatusDotColor(status);
  const statusLabel = getStatusLabel(status);

  return (
    <Table.Tr
      onClick={() => onClick(user)}
      style={{ cursor: 'pointer' }}
      aria-label={`Edit user ${user.name}`}
    >
      {/* Avatar + Name */}
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <Avatar
            src={user.avatarUrl}
            size={32}
            radius="xl"
            style={{
              backgroundColor: 'var(--v-bg-surface)',
              border: '1px solid var(--v-border-subtle)',
              flexShrink: 0,
            }}
          >
            <Text
              fz="var(--v-text-xs)"
              fw={500}
              style={{ color: 'var(--v-text-secondary)' }}
            >
              {getInitials(user.name)}
            </Text>
          </Avatar>
          <TruncatedText
            fz="var(--v-text-sm)"
            fw={500}
            style={{ color: 'var(--v-text-primary)' }}
          >
            {user.name}
          </TruncatedText>
        </Group>
      </Table.Td>

      {/* Email */}
      <Table.Td>
        <TruncatedText
          fz="var(--v-text-sm)"
          style={{ color: 'var(--v-text-secondary)' }}
        >
          {user.email}
        </TruncatedText>
      </Table.Td>

      {/* Role badge */}
      <Table.Td>
        {primaryRole ? (
          <Badge
            size="sm"
            variant="light"
            style={{
              backgroundColor: `color-mix(in srgb, ${getRoleBadgeColor(primaryRole.name)} 12%, transparent)`,
              color: getRoleBadgeColor(primaryRole.name),
              border: `1px solid color-mix(in srgb, ${getRoleBadgeColor(primaryRole.name)} 24%, transparent)`,
              fontWeight: 500,
              fontSize: 'var(--v-text-xs)',
            }}
          >
            {primaryRole.name}
          </Badge>
        ) : (
          <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-tertiary)' }}>
            —
          </Text>
        )}
      </Table.Td>

      {/* Status */}
      <Table.Td>
        <Tooltip label={statusLabel} openDelay={300} position="top">
          <Group gap="xs" wrap="nowrap">
            <Box
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: statusDotColor,
                flexShrink: 0,
              }}
              aria-label={statusLabel}
            />
            <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-secondary)' }}>
              {statusLabel}
            </Text>
          </Group>
        </Tooltip>
      </Table.Td>

      {/* Joined date */}
      <Table.Td>
        <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-tertiary)' }}>
          {new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

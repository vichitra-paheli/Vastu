'use client';

/**
 * RoleCard — Displays a single role with its metadata and an overflow menu.
 *
 * System roles (isSystem === true) only expose "View users" in the menu.
 * Custom roles expose: Edit, Duplicate, View users, Delete.
 *
 * Design:
 *  - Card with name, system/custom badge, user count, description (truncated)
 *  - Overflow menu (⋯) top-right via ActionIcon + Menu
 *
 * Patterns Library §3 (Cards), §10 (Toasts), Style Guide §2 (Typography)
 */

import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Menu,
  Text,
} from '@mantine/core';
import {
  IconDotsVertical,
  IconEdit,
  IconCopy,
  IconUsers,
  IconTrash,
} from '@tabler/icons-react';
import { TruncatedText } from '@/components/shared/TruncatedText';
import { t } from '@/lib/i18n';

export interface RoleCardRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
}

export interface RoleCardProps {
  role: RoleCardRole;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onViewUsers: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RoleCard({ role, onEdit, onDuplicate, onViewUsers, onDelete }: RoleCardProps) {
  return (
    <Card
      padding="lg"
      radius="md"
      withBorder
      style={{ borderColor: 'var(--v-border-default)' }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        {/* Left: name + badge */}
        <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <Text
            fw={500}
            fz="var(--v-text-md)"
            style={{ color: 'var(--v-text-primary)', flexShrink: 0 }}
          >
            {role.name}
          </Text>
          <Badge
            size="xs"
            radius="sm"
            variant="light"
            style={
              role.isSystem
                ? {
                    backgroundColor: 'var(--v-bg-secondary)',
                    color: 'var(--v-text-secondary)',
                  }
                : {
                    backgroundColor: 'var(--v-accent-primary-light)',
                    color: 'var(--v-accent-primary)',
                  }
            }
          >
            {role.isSystem ? t('roles.badge.system') : t('roles.badge.custom')}
          </Badge>
        </Group>

        {/* Right: overflow menu */}
        <Menu shadow="md" width={180} position="bottom-end" withinPortal={false}>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              size="sm"
              aria-label={t('roles.menu.openLabel')}
              style={{ color: 'var(--v-text-tertiary)', flexShrink: 0 }}
            >
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            {!role.isSystem && (
              <>
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={() => onEdit(role.id)}
                >
                  {t('common.edit')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCopy size={14} />}
                  onClick={() => onDuplicate(role.id)}
                >
                  {t('roles.menu.duplicate')}
                </Menu.Item>
              </>
            )}
            <Menu.Item
              leftSection={<IconUsers size={14} />}
              onClick={() => onViewUsers(role.id)}
            >
              {t('roles.menu.viewUsers')}
            </Menu.Item>
            {!role.isSystem && (
              <>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  style={{ color: 'var(--v-status-error)' }}
                  onClick={() => onDelete(role.id)}
                >
                  {t('common.delete')}
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* User count */}
      <Text
        fz="var(--v-text-sm)"
        mt="xs"
        style={{ color: 'var(--v-text-secondary)' }}
      >
        {role.userCount === 1
          ? t('roles.userCount.singular')
          : t('roles.userCount.plural').replace('{count}', String(role.userCount))}
      </Text>

      {/* Description */}
      {role.description !== null && role.description !== '' && (
        <TruncatedText
          fz="var(--v-text-sm)"
          mt="xs"
          lines={2}
          style={{ color: 'var(--v-text-secondary)' }}
        >
          {role.description}
        </TruncatedText>
      )}
    </Card>
  );
}

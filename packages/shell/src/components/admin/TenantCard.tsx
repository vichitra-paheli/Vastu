'use client';

/**
 * TenantCard — Displays a single tenant with status badge, metadata, and actions.
 *
 * Design:
 * - Active status badge: green (--v-status-success)
 * - Sandbox status badge: amber (--v-status-warning)
 * - Current tenant highlighted with accent-primary border
 * - "Switch" button on non-current tenants
 * - Overflow menu: Edit, View users, Archive (destructive)
 *
 * Patterns Library §5 — Cards, §10 — Context menus.
 */

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconDots,
  IconEdit,
  IconUsers,
  IconArchive,
  IconArrowsExchange,
  IconBuilding,
} from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../shared/TruncatedText';

export interface TenantCardData {
  id: string;
  name: string;
  subdomain: string;
  status: 'ACTIVE' | 'SANDBOX';
  region: string | null;
  dbIsolationMode: string;
  createdAt: Date | string;
  userCount: number;
}

export interface TenantCardProps {
  tenant: TenantCardData;
  isCurrent: boolean;
  onSwitch: (id: string) => void;
  onEdit: (id: string) => void;
  onViewUsers: (id: string) => void;
  onArchive: (id: string) => void;
}

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Active',
    color: 'var(--v-status-success)',
    bg: 'var(--v-status-success-subtle)',
  },
  SANDBOX: {
    label: 'Sandbox',
    color: 'var(--v-status-warning)',
    bg: 'var(--v-status-warning-subtle)',
  },
} as const;

const DB_ISOLATION_LABELS: Record<string, string> = {
  shared_schema: 'Shared schema',
  separate_schema: 'Separate schema',
  separate_db: 'Separate DB',
};

function formatDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function TenantCard({ tenant, isCurrent, onSwitch, onEdit, onViewUsers, onArchive }: TenantCardProps) {
  const statusCfg = STATUS_CONFIG[tenant.status];
  const isolationLabel =
    DB_ISOLATION_LABELS[tenant.dbIsolationMode] ?? tenant.dbIsolationMode;

  return (
    <Card
      padding="lg"
      radius="md"
      withBorder
      data-testid="tenant-card"
      style={{
        borderColor: isCurrent ? 'var(--v-accent-primary)' : undefined,
        borderWidth: isCurrent ? 2 : undefined,
      }}
    >
      {/* Header row: name + status badge + overflow menu */}
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <IconBuilding
            size={18}
            stroke={1.5}
            style={{ color: 'var(--v-text-tertiary)', flexShrink: 0 }}
            aria-hidden="true"
          />
          <TruncatedText
            fz="var(--v-text-md)"
            fw={500}
            c="var(--v-text-primary)"
          >
            {tenant.name}
          </TruncatedText>
          {isCurrent && (
            <Badge
              size="xs"
              variant="light"
              style={{
                backgroundColor: 'var(--v-accent-primary-subtle)',
                color: 'var(--v-accent-primary)',
                flexShrink: 0,
              }}
            >
              {t('tenants.current')}
            </Badge>
          )}
        </Group>

        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Badge
            size="sm"
            variant="light"
            style={{
              backgroundColor: statusCfg.bg,
              color: statusCfg.color,
            }}
          >
            {statusCfg.label}
          </Badge>

          <Menu position="bottom-end" shadow="sm" width={180}>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={t('tenants.card.menuLabel')}
              >
                <IconDots size={16} stroke={1.5} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEdit size={14} stroke={1.5} />}
                onClick={() => { onEdit(tenant.id); }}
              >
                {t('common.edit')}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconUsers size={14} stroke={1.5} />}
                onClick={() => { onViewUsers(tenant.id); }}
              >
                {t('tenants.card.viewUsers')}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconArchive size={14} stroke={1.5} />}
                style={{ color: 'var(--v-status-error)' }}
                onClick={() => { onArchive(tenant.id); }}
                disabled={isCurrent}
              >
                {t('tenants.card.archive')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {/* Metadata */}
      <Stack gap={4} mb="md">
        <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
          {t('tenants.card.subdomain')}: <Text span fw={500} c="var(--v-text-primary)" fz="var(--v-text-sm)">{tenant.subdomain}</Text>
        </Text>
        <Group gap="xl">
          <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
            {t('tenants.card.users')}: <Text span fw={500} c="var(--v-text-primary)" fz="var(--v-text-sm)">{tenant.userCount}</Text>
          </Text>
          {tenant.region && (
            <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
              {t('tenants.card.region')}: <Text span fw={500} c="var(--v-text-primary)" fz="var(--v-text-sm)">{tenant.region}</Text>
            </Text>
          )}
          <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
            {t('tenants.card.isolation')}: <Text span fw={500} c="var(--v-text-primary)" fz="var(--v-text-sm)">{isolationLabel}</Text>
          </Text>
        </Group>
        <Text fz="var(--v-text-sm)" c="var(--v-text-tertiary)">
          {t('tenants.card.created')}: {formatDate(tenant.createdAt)}
        </Text>
      </Stack>

      {/* Footer: Switch button for non-current tenants */}
      {!isCurrent && (
        <Button
          variant="light"
          size="xs"
          leftSection={<IconArrowsExchange size={14} stroke={1.5} />}
          onClick={() => { onSwitch(tenant.id); }}
        >
          {t('tenants.card.switch')}
        </Button>
      )}
    </Card>
  );
}

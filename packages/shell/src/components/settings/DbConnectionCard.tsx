'use client';

/**
 * DbConnectionCard — Card showing a single database connection.
 *
 * Implements US-016 AC-2, AC-5.
 *
 * Displays:
 * - Connection name
 * - Masked connection string (host:port/database)
 * - Health status dot: Live=green, Idle=yellow, Error=red, Unknown=grey
 * - Protocol badge (e.g. "postgresql")
 * - Last-checked timestamp
 * - Overflow menu: Edit, Test connection, View schema, Delete
 */

import { Card, Group, Stack, Text, Badge, ActionIcon, Menu, Tooltip, Box } from '@mantine/core';
import {
  IconDotsVertical,
  IconEdit,
  IconPlugConnected,
  IconTable,
  IconTrash,
} from '@tabler/icons-react';
import type { DbConnection } from '@vastu/shared/types';
import { mask } from '@vastu/shared/utils';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../shared/TruncatedText';

// Health status display config
const HEALTH_STATUS_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  live: { color: 'var(--v-status-success)', label: 'databases.health.live' },
  idle: { color: 'var(--v-status-warning)', label: 'databases.health.idle' },
  error: { color: 'var(--v-status-error)', label: 'databases.health.error' },
  unknown: { color: 'var(--v-text-tertiary)', label: 'databases.health.unknown' },
};

function getHealthConfig(status: string) {
  return HEALTH_STATUS_CONFIG[status] ?? HEALTH_STATUS_CONFIG.unknown!;
}

/** Format a date as a relative "N minutes ago" string. */
function formatLastChecked(date: Date | null | string): string {
  if (!date) return t('databases.card.never');
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

/** Build a displayable (masked) connection string from host:port/database. */
function buildConnectionString(connection: DbConnection): string {
  const raw = `${connection.host}:${connection.port}/${connection.database}`;
  return mask(raw, 8, 4);
}

export interface DbConnectionCardProps {
  connection: DbConnection;
  onEdit: () => void;
  onTest: () => void;
  onDelete: () => void;
  /** Optional: opens a schema viewer for this connection */
  onViewSchema?: () => void;
}

export function DbConnectionCard({
  connection,
  onEdit,
  onTest,
  onDelete,
  onViewSchema,
}: DbConnectionCardProps) {
  const healthConfig = getHealthConfig(connection.healthStatus);
  const connectionString = buildConnectionString(connection);
  const lastChecked = formatLastChecked(connection.lastHealthCheck);

  return (
    <Card
      padding="lg"
      radius="md"
      withBorder
      style={{
        borderColor: 'var(--v-border-default)',
        backgroundColor: 'var(--v-bg-elevated)',
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        {/* Left: name + connection string + last checked */}
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm" align="center" wrap="nowrap">
            {/* Health status dot */}
            <Tooltip
              label={t(healthConfig.label)}
              withArrow
              position="top"
            >
              <Box
                role="status"
                aria-label={t(healthConfig.label)}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: healthConfig.color,
                  flexShrink: 0,
                }}
              />
            </Tooltip>

            <TruncatedText
              style={{
                fontWeight: 'var(--v-font-medium)',
                fontSize: 'var(--v-text-md)',
                color: 'var(--v-text-primary)',
              }}
            >
              {connection.name}
            </TruncatedText>

            {/* Protocol badge */}
            <Badge
              size="xs"
              variant="outline"
              style={{
                borderColor: 'var(--v-border-strong)',
                color: 'var(--v-text-secondary)',
                textTransform: 'lowercase',
                flexShrink: 0,
              }}
            >
              {connection.protocol}
            </Badge>

            {/* SSL badge — only shown when SSL is enabled */}
            {connection.sslEnabled && (
              <Badge
                size="xs"
                variant="light"
                style={{
                  backgroundColor: 'var(--v-accent-primary-light)',
                  color: 'var(--v-accent-primary)',
                  flexShrink: 0,
                }}
              >
                {t('databases.card.ssl')}
              </Badge>
            )}
          </Group>

          {/* Masked connection string */}
          <Text
            fz="var(--v-text-sm)"
            style={{
              color: 'var(--v-text-tertiary)',
              fontFamily: 'var(--v-font-mono)',
            }}
          >
            {connectionString}
          </Text>

          {/* Last health check */}
          <Text fz="var(--v-text-xs)" style={{ color: 'var(--v-text-tertiary)' }}>
            {t('databases.card.lastChecked')}: {lastChecked}
          </Text>
        </Stack>

        {/* Right: overflow menu */}
        <Menu position="bottom-end" withArrow shadow="md" withinPortal={false}>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              size="sm"
              aria-label={`Options for ${connection.name}`}
              style={{ color: 'var(--v-text-secondary)', flexShrink: 0 }}
            >
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconEdit size={14} />}
              onClick={onEdit}
            >
              {t('databases.card.menu.edit')}
            </Menu.Item>

            <Menu.Item
              leftSection={<IconPlugConnected size={14} />}
              onClick={onTest}
            >
              {t('databases.card.menu.test')}
            </Menu.Item>

            {onViewSchema && (
              <Menu.Item
                leftSection={<IconTable size={14} />}
                onClick={onViewSchema}
              >
                {t('databases.card.menu.viewSchema')}
              </Menu.Item>
            )}

            <Menu.Divider />

            <Menu.Item
              leftSection={<IconTrash size={14} />}
              color="red"
              onClick={onDelete}
            >
              {t('databases.card.menu.delete')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}

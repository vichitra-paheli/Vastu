'use client';

/**
 * SsoProviderCard — Card display for a configured SSO identity provider.
 * US-019, AC-2: Name, protocol badge (SAML/OIDC), status (Live=green, Draft=gray),
 * "Default" badge on primary provider, overflow menu.
 *
 * Design: Patterns Library §3 (Cards), Style Guide §8 (Badges/Icons).
 * All colors via --v-* CSS tokens. All strings via t().
 */

import { Badge, Card, Group, Menu, ActionIcon, Stack } from '@mantine/core';
import {
  IconDots,
  IconEdit,
  IconPlugConnected,
  IconStar,
  IconTrash,
} from '@tabler/icons-react';
import { t } from '@/lib/i18n';
import { TruncatedText } from '../shared/TruncatedText';
import type { SsoProviderConfig } from '@/types/sso-provider';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProtocolBadge({ protocol }: { protocol: SsoProviderConfig['protocol'] }) {
  const isSaml = protocol === 'SAML';
  return (
    <Badge
      size="sm"
      variant="light"
      style={{
        backgroundColor: isSaml
          ? 'var(--v-accent-quaternary-light)'
          : 'var(--v-accent-primary-light)',
        color: isSaml ? 'var(--v-accent-quaternary)' : 'var(--v-accent-primary)',
        border: 'none',
        fontWeight: 'var(--v-font-medium)',
        fontSize: 'var(--v-text-xs)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {protocol}
    </Badge>
  );
}

function StatusBadge({ status }: { status: SsoProviderConfig['status'] }) {
  const isLive = status === 'LIVE';
  return (
    <Badge
      size="sm"
      variant="light"
      style={{
        backgroundColor: isLive ? 'var(--v-status-success-light)' : 'var(--v-bg-secondary)',
        color: isLive ? 'var(--v-status-success)' : 'var(--v-text-tertiary)',
        border: 'none',
        fontWeight: 'var(--v-font-medium)',
        fontSize: 'var(--v-text-xs)',
      }}
    >
      {isLive ? t('sso.config.status.live') : t('sso.config.status.draft')}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SsoProviderCardProps {
  provider: SsoProviderConfig;
  onEdit: (provider: SsoProviderConfig) => void;
  onTest: (provider: SsoProviderConfig) => void;
  onSetDefault: (provider: SsoProviderConfig) => void;
  onDelete: (provider: SsoProviderConfig) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SsoProviderCard({
  provider,
  onEdit,
  onTest,
  onSetDefault,
  onDelete,
}: SsoProviderCardProps) {
  return (
    <Card padding="lg" radius="md" withBorder>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        {/* Left: name + badges */}
        <Stack gap="xs" style={{ minWidth: 0, flex: 1 }}>
          <Group gap="sm" align="center" wrap="nowrap">
            <TruncatedText
              style={{
                fontWeight: 'var(--v-font-medium)',
                fontSize: 'var(--v-text-md)',
                color: 'var(--v-text-primary)',
              }}
            >
              {provider.name}
            </TruncatedText>
            {provider.isDefault && (
              <Badge
                size="sm"
                variant="light"
                style={{
                  backgroundColor: 'var(--v-accent-primary-light)',
                  color: 'var(--v-accent-primary)',
                  border: 'none',
                  fontWeight: 'var(--v-font-medium)',
                  fontSize: 'var(--v-text-xs)',
                  flexShrink: 0,
                }}
              >
                {t('sso.config.default')}
              </Badge>
            )}
          </Group>
          <Group gap="sm" align="center">
            <ProtocolBadge protocol={provider.protocol} />
            <StatusBadge status={provider.status} />
          </Group>
        </Stack>

        {/* Right: overflow menu */}
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              aria-label={t('sso.config.menu.aria')}
              style={{ color: 'var(--v-text-tertiary)', flexShrink: 0 }}
            >
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconEdit size={16} />}
              onClick={() => onEdit(provider)}
            >
              {t('common.edit')}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconPlugConnected size={16} />}
              onClick={() => onTest(provider)}
            >
              {t('sso.config.menu.test')}
            </Menu.Item>
            {!provider.isDefault && (
              <Menu.Item
                leftSection={<IconStar size={16} />}
                onClick={() => onSetDefault(provider)}
              >
                {t('sso.config.menu.setDefault')}
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconTrash size={16} />}
              onClick={() => onDelete(provider)}
              style={{ color: 'var(--v-status-error)' }}
            >
              {t('common.delete')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Metadata URL if present */}
      {provider.metadataUrl !== null && (
        <TruncatedText
          fz="var(--v-text-sm)"
          c="var(--v-text-tertiary)"
          mt="sm"
          style={{ fontFamily: 'var(--v-font-mono)' }}
        >
          {provider.metadataUrl}
        </TruncatedText>
      )}
    </Card>
  );
}

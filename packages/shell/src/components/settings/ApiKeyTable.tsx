'use client';

/**
 * ApiKeyTable — Client component that renders the API keys table.
 *
 * Features:
 * - Table: name, masked key (sk_live_...4f2a), scope badge, last used (relative time), overflow menu
 * - Scope badges: Full = accent-primary, Read only = warning
 * - Overflow menu: Copy key ID, Revoke (confirmation dialog)
 * - Empty state when no keys exist
 * - "+ Generate" button opens GenerateKeyModal
 * - After generation: KeyDisplayModal shows the key once
 *
 * All colors via --v-* tokens. All strings via t().
 * Patterns Library §2 Tables, §8 Empty states, §10 Toasts.
 */

import { useState, useCallback } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Table,
  Text,
} from '@mantine/core';
import {
  IconDots,
  IconCopy,
  IconTrash,
  IconKey,
} from '@tabler/icons-react';
import type { ApiKey, ApiKeyWithPrefix } from '@vastu/shared/types';
import { relativeTime } from '@vastu/shared/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TruncatedText } from '@/components/shared/TruncatedText';
import { showSuccess, showError } from '@/lib/notifications';
import { t } from '@/lib/i18n';
import { GenerateKeyModal } from './GenerateKeyModal';
import { KeyDisplayModal } from './KeyDisplayModal';

export interface ApiKeyTableProps {
  initialKeys: ApiKey[];
}

// CSS token maps for scope badge styling — avoids Mantine named color strings
const SCOPE_BADGE_STYLE: Record<string, { backgroundColor: string; color: string }> = {
  full: {
    backgroundColor: 'var(--v-accent-primary-light)',
    color: 'var(--v-accent-primary)',
  },
  read_only: {
    backgroundColor: 'var(--v-status-warning-light)',
    color: 'var(--v-status-warning)',
  },
};

// Translation key map for scope badges
const SCOPE_LABEL_KEY: Record<string, string> = {
  full: 'apiKeys.scope.fullShort',
  read_only: 'apiKeys.scope.readOnlyShort',
};

export function ApiKeyTable({ initialKeys }: ApiKeyTableProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [displayKey, setDisplayKey] = useState<ApiKeyWithPrefix | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // After generating a key, add it to the list and show the display modal
  const handleGenerated = useCallback((newKey: ApiKeyWithPrefix) => {
    // Build a plain ApiKey record by omitting fullKey (which is only available at creation time)
    const keyRecord: ApiKey = {
      id: newKey.id,
      name: newKey.name,
      keyPrefix: newKey.keyPrefix,
      scope: newKey.scope,
      description: newKey.description,
      lastUsedAt: newKey.lastUsedAt,
      requestCount24h: newKey.requestCount24h,
      userId: newKey.userId,
      organizationId: newKey.organizationId,
      createdAt: newKey.createdAt,
      updatedAt: newKey.updatedAt,
      deletedAt: newKey.deletedAt,
    };
    setKeys((prev) => [keyRecord, ...prev]);
    setGenerateOpen(false);
    setDisplayKey(newKey);
  }, []);

  const handleCopyId = useCallback((key: ApiKey) => {
    navigator.clipboard
      .writeText(key.id)
      .then(() => showSuccess(t('apiKeys.copyId.success')))
      .catch(() => showError(t('apiKeys.copyId.error')));
  }, []);

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const response = await fetch(`/api/settings/api-keys/${revokeTarget.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('error.generic'), t('apiKeys.revoke.errorTitle'));
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
      showSuccess(t('apiKeys.revoke.success'));
      setRevokeTarget(null);
    } catch {
      showError(t('error.networkError'), t('apiKeys.revoke.errorTitle'));
    } finally {
      setRevoking(false);
    }
  }, [revokeTarget]);

  return (
    <Box>
      {/* Page header */}
      <Group justify="space-between" mb="lg">
        <Text fz="var(--v-text-xl)" fw={500} c="var(--v-text-primary)">
          {t('apiKeys.title')}
        </Text>
        <Button
          leftSection={<IconKey size={16} />}
          onClick={() => setGenerateOpen(true)}
          aria-label={t('apiKeys.generate.ariaLabel')}
        >
          {t('apiKeys.generate.button')}
        </Button>
      </Group>

      {keys.length === 0 ? (
        <EmptyState
          icon={IconKey}
          message={t('apiKeys.empty.message')}
          actionLabel={t('apiKeys.generate.button')}
          onAction={() => setGenerateOpen(true)}
        />
      ) : (
        <Table
          striped={false}
          highlightOnHover
          withTableBorder
          withColumnBorders={false}
          style={{ borderColor: 'var(--v-border-default)' }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ color: 'var(--v-text-secondary)', fontSize: 'var(--v-text-sm)', fontWeight: 500 }}>
                {t('apiKeys.table.name')}
              </Table.Th>
              <Table.Th style={{ color: 'var(--v-text-secondary)', fontSize: 'var(--v-text-sm)', fontWeight: 500 }}>
                {t('apiKeys.table.key')}
              </Table.Th>
              <Table.Th style={{ color: 'var(--v-text-secondary)', fontSize: 'var(--v-text-sm)', fontWeight: 500 }}>
                {t('apiKeys.table.scope')}
              </Table.Th>
              <Table.Th style={{ color: 'var(--v-text-secondary)', fontSize: 'var(--v-text-sm)', fontWeight: 500 }}>
                {t('apiKeys.table.lastUsed')}
              </Table.Th>
              <Table.Th style={{ width: 40 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {keys.map((key) => (
              <Table.Tr key={key.id}>
                {/* Name */}
                <Table.Td>
                  <TruncatedText
                    fz="var(--v-text-sm)"
                    c="var(--v-text-primary)"
                    fw={500}
                    maxWidth={200}
                  >
                    {key.name}
                  </TruncatedText>
                </Table.Td>

                {/* Masked key — shows prefix (first 12 chars) + ellipsis + last 4 placeholder */}
                <Table.Td>
                  <Text
                    fz="var(--v-text-sm)"
                    c="var(--v-text-secondary)"
                    style={{ fontFamily: 'var(--v-font-mono)' }}
                  >
                    {`${key.keyPrefix}...••••`}
                  </Text>
                </Table.Td>

                {/* Scope badge */}
                <Table.Td>
                  <Badge
                    size="sm"
                    variant="light"
                    style={
                      SCOPE_BADGE_STYLE[key.scope] ?? {
                        backgroundColor: 'var(--v-accent-primary-light)',
                        color: 'var(--v-accent-primary)',
                      }
                    }
                    data-testid="scope-badge"
                    data-scope={key.scope}
                  >
                    {t(SCOPE_LABEL_KEY[key.scope] ?? key.scope)}
                  </Badge>
                </Table.Td>

                {/* Last used */}
                <Table.Td>
                  <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
                    {key.lastUsedAt ? relativeTime(key.lastUsedAt) : t('apiKeys.table.neverUsed')}
                  </Text>
                </Table.Td>

                {/* Overflow menu */}
                <Table.Td>
                  <Menu position="bottom-end" withinPortal={false}>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={t('apiKeys.table.menuAriaLabel')}
                        style={{ color: 'var(--v-text-secondary)' }}
                      >
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        onClick={() => handleCopyId(key)}
                      >
                        {t('apiKeys.table.copyId')}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        style={{ color: 'var(--v-status-error)' }}
                        onClick={() => setRevokeTarget(key)}
                      >
                        {t('apiKeys.table.revoke')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Generate key modal */}
      <GenerateKeyModal
        opened={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={handleGenerated}
      />

      {/* Key display modal (shown once after generation) */}
      <KeyDisplayModal
        opened={displayKey !== null}
        onClose={() => setDisplayKey(null)}
        apiKey={displayKey}
      />

      {/* Revoke confirmation dialog */}
      <ConfirmDialog
        opened={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title={t('apiKeys.revoke.title')}
        message={t('apiKeys.revoke.message')}
        confirmLabel={t('apiKeys.revoke.confirm')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        loading={revoking}
      />
    </Box>
  );
}

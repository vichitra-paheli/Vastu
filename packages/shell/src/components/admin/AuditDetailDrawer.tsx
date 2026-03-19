'use client';

/**
 * AuditDetailDrawer — Mantine Drawer showing full details of a single audit event.
 *
 * Shows:
 *   - Full event payload as formatted JSON
 *   - Before/after diff for Update events (side-by-side JSON blocks)
 *   - IP address
 *   - User agent
 *   - Event metadata (ID, timestamp, user)
 *
 * All strings via t(). All colors via --v-* tokens.
 *
 * MCP tool equivalent: get_audit_event({ id })
 */

import { Box, Code, Drawer, Group, Stack, Text, Title } from '@mantine/core';
import type { AuditEvent } from '@vastu/shared/types';
import { formatTimestamp } from '@vastu/shared/utils';
import { t } from '../../lib/i18n';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AuditDetailDrawerProps {
  event: AuditEvent | null;
  opened: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function JsonBlock({ value }: { value: Record<string, unknown> | null | undefined }) {
  if (!value) {
    return (
      <Text fz="var(--v-text-sm)" c="var(--v-text-tertiary)" fs="italic">
        {t('auditLog.detail.noPayload')}
      </Text>
    );
  }
  return (
    <Code
      block
      style={{
        fontFamily: 'var(--v-font-mono)',
        fontSize: '12px',
        backgroundColor: 'var(--v-bg-secondary)',
        color: 'var(--v-text-primary)',
        borderRadius: 'var(--v-radius-md)',
        padding: '12px',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Code>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Group gap="xs" align="flex-start">
      <Text
        fz="var(--v-text-xs)"
        fw={500}
        c="var(--v-text-secondary)"
        style={{ minWidth: 100, flexShrink: 0 }}
      >
        {label}
      </Text>
      <Text fz="var(--v-text-sm)" c="var(--v-text-primary)" style={{ wordBreak: 'break-all' }}>
        {value}
      </Text>
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditDetailDrawer({ event, opened, onClose }: AuditDetailDrawerProps) {
  const isUpdate =
    event !== null &&
    event.action.toLowerCase() === 'update' &&
    (event.beforeState !== null || event.afterState !== null);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Title order={4} style={{ color: 'var(--v-text-primary)' }}>
          {t('auditLog.detail.title')}
        </Title>
      }
      position="right"
      size="lg"
      styles={{
        body: { paddingTop: 0 },
        header: { borderBottom: '1px solid var(--v-border-subtle)', paddingBottom: 16 },
      }}
    >
      {event === null ? null : (
        <Stack gap="lg" pt="md">
          {/* Metadata */}
          <Stack gap="xs">
            <MetaRow label={t('auditLog.detail.eventId')} value={event.id} />
            <MetaRow label={t('auditLog.detail.timestamp')} value={formatTimestamp(event.createdAt)} />
            <MetaRow
              label={t('auditLog.detail.user')}
              value={event.userName ?? '—'}
            />
            <MetaRow
              label={t('auditLog.detail.ipAddress')}
              value={event.ipAddress ?? t('auditLog.detail.noIpAddress')}
            />
            <MetaRow
              label={t('auditLog.detail.userAgent')}
              value={event.userAgent ?? t('auditLog.detail.noUserAgent')}
            />
          </Stack>

          {/* Divider */}
          <Box style={{ borderTop: '1px solid var(--v-border-subtle)' }} />

          {/* Before/after diff for updates */}
          {isUpdate ? (
            <Stack gap="sm">
              <Text fz="var(--v-text-sm)" fw={500} c="var(--v-text-primary)">
                {t('auditLog.detail.diff')}
              </Text>
              <Stack gap="xs">
                <Text fz="var(--v-text-xs)" fw={500} c="var(--v-text-secondary)">
                  {t('auditLog.detail.beforeState')}
                </Text>
                <JsonBlock value={event.beforeState} />
              </Stack>
              <Stack gap="xs">
                <Text fz="var(--v-text-xs)" fw={500} c="var(--v-text-secondary)">
                  {t('auditLog.detail.afterState')}
                </Text>
                <JsonBlock value={event.afterState} />
              </Stack>
            </Stack>
          ) : null}

          {/* Full event payload */}
          <Stack gap="sm">
            <Text fz="var(--v-text-sm)" fw={500} c="var(--v-text-primary)">
              {t('auditLog.detail.payload')}
            </Text>
            <JsonBlock value={event.payload} />
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}

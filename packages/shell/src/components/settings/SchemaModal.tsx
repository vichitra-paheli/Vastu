'use client';

/**
 * SchemaModal — Displays database schema information for a DB connection.
 *
 * Implements US-016 AC-5 (View schema menu item).
 *
 * Phase 0 behaviour: fetches schema from
 *   GET /api/settings/db-connections/[id]/schema
 * which returns a stub response indicating that live schema inspection
 * requires an active database driver (available in a later phase).
 *
 * The component renders:
 *   - Loading skeleton while the request is in flight
 *   - Table/column list when data is available
 *   - Informational notice when the schema endpoint is not yet implemented
 *   - Error state with retry when the request fails
 *
 * Patterns Library §6 (loading choreography), §8 (empty states).
 * All colors via --v-* CSS custom properties.
 * All strings via t().
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Modal,
  Stack,
  Text,
  Alert,
  Skeleton,
  Accordion,
  Badge,
  Group,
  Button,
  Box,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconTable,
  IconInfoCircle,
} from '@tabler/icons-react';
import type { DbConnection } from '@vastu/shared/types';
import { t } from '@/lib/i18n';
import { TruncatedText } from '../shared/TruncatedText';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

export interface SchemaResponse {
  /** When true the API returned usable schema data. */
  available: boolean;
  /** Human-readable reason when available=false. */
  reason?: string;
  tables?: SchemaTable[];
}

// ── Fetch state ───────────────────────────────────────────────────────────────

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: SchemaResponse }
  | { status: 'error'; message: string };

// ── Component ─────────────────────────────────────────────────────────────────

export interface SchemaModalProps {
  opened: boolean;
  connection: DbConnection | null;
  onClose: () => void;
}

export function SchemaModal({ opened, connection, onClose }: SchemaModalProps) {
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });

  const fetchSchema = useCallback(async (connectionId: string) => {
    setFetchState({ status: 'loading' });
    try {
      const res = await fetch(`/api/settings/db-connections/${connectionId}/schema`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setFetchState({
          status: 'error',
          message: body.error ?? t('error.generic'),
        });
        return;
      }
      const data = (await res.json()) as SchemaResponse;
      setFetchState({ status: 'success', data });
    } catch {
      setFetchState({ status: 'error', message: t('databases.schema.error') });
    }
  }, []);

  // Track previous opened state to trigger fetch only on open transition
  const prevOpened = useRef(false);
  /* eslint-disable react-hooks/set-state-in-effect -- fetchSchema and setFetchState are intentional async/sync state transitions on modal open/close */
  useEffect(() => {
    const wasOpened = prevOpened.current;
    prevOpened.current = opened;
    if (opened && !wasOpened && connection) {
      void fetchSchema(connection.id);
    }
    if (!opened && wasOpened) {
      setFetchState({ status: 'idle' });
    }
  }, [opened, connection, fetchSchema]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleClose() {
    onClose();
  }

  function handleRetry() {
    if (connection) {
      void fetchSchema(connection.id);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        connection
          ? `${t('databases.schema.title')}: ${connection.name}`
          : t('databases.schema.title')
      }
      size="lg"
    >
      <Stack gap="md">
        {/* Loading state — skeleton matching expected table list layout */}
        {fetchState.status === 'loading' && (
          <Stack gap="sm" aria-label={t('databases.schema.loading')} aria-busy="true">
            <Skeleton height={36} radius="sm" />
            <Skeleton height={36} radius="sm" />
            <Skeleton height={36} radius="sm" />
          </Stack>
        )}

        {/* Error state */}
        {fetchState.status === 'error' && (
          <Stack gap="sm">
            <Alert
              icon={<IconAlertCircle size={16} style={{ color: 'var(--v-status-error)' }} />}
              variant="light"
              style={{
                borderColor: 'var(--v-status-error)',
                backgroundColor: 'var(--v-status-error-light)',
                color: 'var(--v-status-error)',
              }}
            >
              <Text fz="var(--v-text-sm)">{fetchState.message}</Text>
            </Alert>
            <Group justify="flex-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                style={{ color: 'var(--v-accent-primary)' }}
              >
                {t('databases.schema.retry')}
              </Button>
            </Group>
          </Stack>
        )}

        {/* Success — schema not yet available (Phase 0 stub) */}
        {fetchState.status === 'success' && !fetchState.data.available && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            variant="light"
            style={{
              borderColor: 'var(--v-border-default)',
              backgroundColor: 'var(--v-bg-secondary)',
            }}
          >
            <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-secondary)' }}>
              {fetchState.data.reason ?? t('databases.schema.unavailable')}
            </Text>
          </Alert>
        )}

        {/* Success — schema available, render table accordion */}
        {fetchState.status === 'success' &&
          fetchState.data.available &&
          fetchState.data.tables !== undefined && (
            <>
              {fetchState.data.tables.length === 0 ? (
                <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-tertiary)' }}>
                  {t('databases.schema.empty')}
                </Text>
              ) : (
                <Accordion variant="separated" radius="md">
                  {fetchState.data.tables.map((table) => (
                    <Accordion.Item key={table.name} value={table.name}>
                      <Accordion.Control
                        icon={
                          <IconTable
                            size={14}
                            style={{ color: 'var(--v-text-tertiary)' }}
                          />
                        }
                      >
                        <Group gap="xs" align="center">
                          <TruncatedText
                            style={{
                              fontFamily: 'var(--v-font-mono)',
                              fontSize: 'var(--v-text-sm)',
                              color: 'var(--v-text-primary)',
                            }}
                          >
                            {table.name}
                          </TruncatedText>
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{
                              borderColor: 'var(--v-border-strong)',
                              color: 'var(--v-text-tertiary)',
                            }}
                          >
                            {table.columns.length}
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="xs">
                          {table.columns.map((col) => (
                            <Box
                              key={col.name}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 0',
                                borderBottom: '1px solid var(--v-border-subtle)',
                              }}
                            >
                              <Group gap="sm" align="center" wrap="nowrap">
                                <TruncatedText
                                  style={{
                                    fontFamily: 'var(--v-font-mono)',
                                    fontSize: 'var(--v-text-sm)',
                                    color: 'var(--v-text-primary)',
                                  }}
                                >
                                  {col.name}
                                </TruncatedText>
                                {col.nullable && (
                                  <Badge
                                    size="xs"
                                    variant="outline"
                                    style={{
                                      borderColor: 'var(--v-border-strong)',
                                      color: 'var(--v-text-tertiary)',
                                      textTransform: 'lowercase',
                                    }}
                                  >
                                    {t('databases.schema.nullable')}
                                  </Badge>
                                )}
                              </Group>
                              <Text
                                fz="var(--v-text-xs)"
                                style={{
                                  fontFamily: 'var(--v-font-mono)',
                                  color: 'var(--v-text-tertiary)',
                                  flexShrink: 0,
                                }}
                              >
                                {col.type}
                              </Text>
                            </Box>
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              )}
            </>
          )}

        {/* Footer close button */}
        <Group justify="flex-end" mt="xs">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            style={{ color: 'var(--v-text-secondary)' }}
          >
            {t('common.cancel')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

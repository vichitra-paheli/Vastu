'use client';

/**
 * AuditLogTable — Client component for the audit log admin page.
 *
 * Features:
 *   - Filters: date range (two date text inputs), user dropdown, action type, resource type
 *   - Mantine Table with server-side pagination (50 rows default)
 *   - Row click opens AuditDetailDrawer
 *   - "Export CSV" button triggers filtered CSV download
 *
 * Data is fetched from /api/admin/audit-log on mount and whenever filters change.
 * Uses the skeleton -> content -> error loading pattern per design system.
 *
 * All strings via t(). All colors via --v-* tokens.
 *
 * MCP tool equivalent: list_audit_events({ filters, page, limit })
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Group,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconDownload, IconClipboardList } from '@tabler/icons-react';
import type { AuditEvent } from '@vastu/shared/types';
import { EmptyState } from '@/components/shared/EmptyState';
import { AuditLogRow } from './AuditLogRow';
import { AuditDetailDrawer } from './AuditDetailDrawer';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  { value: 'Create', label: t('auditLog.action.create') },
  { value: 'Update', label: t('auditLog.action.update') },
  { value: 'Delete', label: t('auditLog.action.delete') },
  { value: 'Login', label: t('auditLog.action.login') },
  { value: 'Export', label: t('auditLog.action.export') },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// AuditEvent shape as returned over the wire (createdAt serialised as ISO string)
type SerializedAuditEvent = Omit<AuditEvent, 'createdAt'> & { createdAt: string };

interface AuditLogResponse {
  events: SerializedAuditEvent[];
  total: number;
  page: number;
  limit: number;
}

interface UserOption {
  value: string;
  label: string;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  userId: string | null;
  action: string | null;
  resourceType: string | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AuditLogTableProps {
  /** Pre-fetched list of users to populate the user dropdown. */
  userOptions: UserOption[];
  /** Pre-fetched list of resource types observed in the audit log. */
  resourceTypeOptions: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditLogTable({ userOptions, resourceTypeOptions }: AuditLogTableProps) {
  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    userId: null,
    action: null,
    resourceType: null,
  });
  const [page, setPage] = useState(1);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasFilters =
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.userId !== null ||
    filters.action !== null ||
    filters.resourceType !== null;

  // Build query string from current filters + page
  const buildQueryString = useCallback(
    (p: number) => {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(PAGE_SIZE));
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.action) params.set('action', filters.action);
      if (filters.resourceType) params.set('resourceType', filters.resourceType);
      return params.toString();
    },
    [filters],
  );

  // Fetch events whenever filters or page changes
  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/audit-log?${buildQueryString(page)}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = (await res.json()) as AuditLogResponse;
        if (cancelled) return;
        // Deserialise createdAt strings back to Date objects
        const withDates = data.events.map((ev) => ({
          ...ev,
          createdAt: new Date(ev.createdAt),
        }));
        setEvents(withDates);
        setTotal(data.total);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError(t('auditLog.error'));
        setLoading(false);
      }
    }

    void fetchEvents();

    return () => {
      cancelled = true;
    };
  }, [page, buildQueryString]);

  // Reset to page 1 when filters change
  function applyFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ dateFrom: '', dateTo: '', userId: null, action: null, resourceType: null });
    setPage(1);
  }

  function handleRowClick(event: AuditEvent) {
    setSelectedEvent(event);
    setDrawerOpen(true);
  }

  function handleExportCsv() {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.action) params.set('action', filters.action);
    if (filters.resourceType) params.set('resourceType', filters.resourceType);

    const url = `/api/admin/audit-log/export?${params.toString()}`;
    // Trigger download in a new tab
    window.open(url, '_blank');
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const resourceTypeSelectOptions = resourceTypeOptions.map((rt) => ({ value: rt, label: rt }));

  return (
    <>
      <Stack gap="md">
        {/* Filter bar */}
        <Group gap="sm" wrap="wrap" align="flex-end">
          <TextInput
            label={t('auditLog.filter.dateFrom')}
            placeholder="YYYY-MM-DD"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => applyFilter('dateFrom', e.currentTarget.value)}
            max={filters.dateTo || undefined}
            size="sm"
            styles={{
              label: { color: 'var(--v-text-primary)', fontWeight: 500 },
              input: { borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' },
            }}
          />
          <TextInput
            label={t('auditLog.filter.dateTo')}
            placeholder="YYYY-MM-DD"
            type="date"
            value={filters.dateTo}
            onChange={(e) => applyFilter('dateTo', e.currentTarget.value)}
            min={filters.dateFrom || undefined}
            size="sm"
            styles={{
              label: { color: 'var(--v-text-primary)', fontWeight: 500 },
              input: { borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' },
            }}
          />
          <Select
            label={t('auditLog.filter.user')}
            placeholder={t('auditLog.filter.user.placeholder')}
            data={userOptions}
            value={filters.userId}
            onChange={(val) => applyFilter('userId', val)}
            clearable
            searchable
            size="sm"
            style={{ minWidth: 180 }}
            comboboxProps={{ keepMounted: false }}
            styles={{
              label: { color: 'var(--v-text-primary)', fontWeight: 500 },
              input: { borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' },
            }}
          />
          <Select
            label={t('auditLog.filter.action')}
            placeholder={t('auditLog.filter.action.placeholder')}
            data={ACTION_OPTIONS}
            value={filters.action}
            onChange={(val) => applyFilter('action', val)}
            clearable
            size="sm"
            style={{ minWidth: 140 }}
            comboboxProps={{ keepMounted: false }}
            styles={{
              label: { color: 'var(--v-text-primary)', fontWeight: 500 },
              input: { borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' },
            }}
          />
          <Select
            label={t('auditLog.filter.resourceType')}
            placeholder={t('auditLog.filter.resourceType.placeholder')}
            data={resourceTypeSelectOptions}
            value={filters.resourceType}
            onChange={(val) => applyFilter('resourceType', val)}
            clearable
            searchable
            size="sm"
            style={{ minWidth: 160 }}
            comboboxProps={{ keepMounted: false }}
            styles={{
              label: { color: 'var(--v-text-primary)', fontWeight: 500 },
              input: { borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' },
            }}
          />
          {hasFilters && (
            <Button
              variant="subtle"
              size="sm"
              onClick={clearFilters}
              style={{ color: 'var(--v-text-secondary)', alignSelf: 'flex-end' }}
            >
              {t('auditLog.filter.clear')}
            </Button>
          )}

          {/* Spacer */}
          <Box style={{ flex: 1 }} />

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            leftSection={<IconDownload size={14} />}
            onClick={handleExportCsv}
            style={{
              borderColor: 'var(--v-border-default)',
              color: 'var(--v-text-primary)',
              alignSelf: 'flex-end',
            }}
            aria-label={t('auditLog.exportCsv')}
          >
            {t('auditLog.exportCsv')}
          </Button>
        </Group>

        {/* Table */}
        {loading ? (
          <Stack gap="xs">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height={40} radius="sm" />
            ))}
          </Stack>
        ) : error !== null ? (
          <Text fz="var(--v-text-sm)" c="var(--v-status-error)">
            {error}
          </Text>
        ) : events.length === 0 ? (
          <EmptyState
            icon={IconClipboardList}
            message={hasFilters ? t('auditLog.empty') : t('auditLog.empty.noFilters')}
          />
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders={false}
              styles={{
                table: { borderColor: 'var(--v-border-subtle)' },
                th: {
                  color: 'var(--v-text-secondary)',
                  fontWeight: 500,
                  fontSize: 'var(--v-text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  borderBottom: '1px solid var(--v-border-subtle)',
                },
                tr: {
                  borderBottom: '1px solid var(--v-border-subtle)',
                },
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('auditLog.table.timestamp')}</Table.Th>
                  <Table.Th>{t('auditLog.table.user')}</Table.Th>
                  <Table.Th>{t('auditLog.table.action')}</Table.Th>
                  <Table.Th>{t('auditLog.table.resource')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {events.map((event) => (
                  <AuditLogRow key={event.id} event={event} onClick={handleRowClick} />
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}

        {/* Pagination */}
        {!loading && events.length > 0 && (
          <Group justify="space-between" align="center">
            <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
              {t('auditLog.pagination.showing')}{' '}
              {Math.min((page - 1) * PAGE_SIZE + 1, total)}
              {'–'}
              {Math.min(page * PAGE_SIZE, total)}{' '}
              {t('auditLog.pagination.of')} {total} {t('auditLog.pagination.results')}
            </Text>
            {totalPages > 1 && (
              <Pagination
                value={page}
                onChange={setPage}
                total={totalPages}
                size="sm"
                styles={{
                  control: {
                    borderColor: 'var(--v-border-default)',
                    color: 'var(--v-text-primary)',
                  },
                }}
              />
            )}
          </Group>
        )}
      </Stack>

      {/* Detail drawer */}
      <AuditDetailDrawer
        event={selectedEvent}
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

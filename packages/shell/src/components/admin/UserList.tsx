'use client';

/**
 * UserList — Admin user management table with search and filters.
 *
 * Features:
 *   - Debounced search input (300ms) filters by name or email
 *   - Role dropdown filter
 *   - Status dropdown filter (Active / Pending / Deactivated)
 *   - Mantine Table rendering UserRow per user
 *   - "+ Invite user" button opens InviteUserModal
 *   - Clicking a row opens EditUserDrawer
 *
 * Data is fetched client-side (filter state changes) via the
 * GET /api/admin/users API route.
 *
 * Loading: TableSkeleton → content → ErrorState pattern.
 * Empty: EmptyState with IconUsers.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button, Group, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TableSkeleton } from '../shared/TableSkeleton';
import { EmptyState } from '../shared/EmptyState';
import { ErrorState } from '../shared/ErrorState';
import { UserRow } from './UserRow';
import { InviteUserModal } from './InviteUserModal';
import { EditUserDrawer } from './EditUserDrawer';
import type { UserListItem } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoleOption {
  value: string;
  label: string;
}

export interface UserListProps {
  /** Pre-loaded role options from the server so the invite modal works immediately. */
  roles: RoleOption[];
}

// ---------------------------------------------------------------------------
// Status options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: t('users.filter.status') },
  { value: 'active', label: t('users.status.active') },
  { value: 'pending', label: t('users.status.pending') },
  { value: 'deactivated', label: t('users.status.deactivated') },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserList({ roles }: UserListProps) {
  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Data state
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Modal / drawer state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);

  // Role options with "All roles" at the top
  const roleSelectOptions = [
    { value: '', label: t('users.filter.role') },
    ...roles,
  ];

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        setLoadError(true);
        return;
      }

      const data = (await response.json()) as { users: UserListItem[] };
      setUsers(data.users);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Stack gap="md">
      {/* Toolbar */}
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm" wrap="wrap">
          {/* Search */}
          <TextInput
            placeholder={t('users.search.placeholder')}
            leftSection={<IconSearch size={16} aria-hidden="true" />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ minWidth: 240 }}
            aria-label={t('users.search.placeholder')}
          />

          {/* Role filter — role="combobox" makes the Select discoverable via getAllByRole('combobox') in tests */}
          <Select
            data={roleSelectOptions}
            value={roleFilter ?? ''}
            onChange={(value) => setRoleFilter(value === '' ? null : value)}
            style={{ minWidth: 140 }}
            aria-label={t('users.filter.role')}
            comboboxProps={{ keepMounted: false }}
            role="combobox"
          />

          {/* Status filter */}
          <Select
            data={STATUS_OPTIONS}
            value={statusFilter ?? ''}
            onChange={(value) => setStatusFilter(value === '' ? null : value)}
            style={{ minWidth: 160 }}
            aria-label={t('users.filter.status')}
            comboboxProps={{ keepMounted: false }}
            role="combobox"
          />
        </Group>

        {/* Invite button */}
        <Button
          leftSection={<IconUserPlus size={16} aria-hidden="true" />}
          onClick={() => setInviteOpen(true)}
        >
          {t('users.invite')}
        </Button>
      </Group>

      {/* Content */}
      {loading ? (
        <TableSkeleton columns={5} rows={6} />
      ) : loadError ? (
        <ErrorState
          message={t('users.loadError')}
          onRetry={() => void fetchUsers()}
        />
      ) : users.length === 0 ? (
        <EmptyState
          icon={IconUsers}
          message={t('users.empty.message')}
          actionLabel={t('users.invite')}
          onAction={() => setInviteOpen(true)}
        />
      ) : (
        <Table
          striped={false}
          highlightOnHover
          withTableBorder
          withColumnBorders={false}
          style={{ tableLayout: 'fixed' }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: '28%' }}>
                <Text fz="var(--v-text-xs)" fw={500} style={{ color: 'var(--v-text-tertiary)' }}>
                  {t('users.table.name')}
                </Text>
              </Table.Th>
              <Table.Th style={{ width: '28%' }}>
                <Text fz="var(--v-text-xs)" fw={500} style={{ color: 'var(--v-text-tertiary)' }}>
                  {t('users.table.email')}
                </Text>
              </Table.Th>
              <Table.Th style={{ width: '16%' }}>
                <Text fz="var(--v-text-xs)" fw={500} style={{ color: 'var(--v-text-tertiary)' }}>
                  {t('users.table.role')}
                </Text>
              </Table.Th>
              <Table.Th style={{ width: '14%' }}>
                <Text fz="var(--v-text-xs)" fw={500} style={{ color: 'var(--v-text-tertiary)' }}>
                  {t('users.table.status')}
                </Text>
              </Table.Th>
              <Table.Th style={{ width: '14%' }}>
                <Text fz="var(--v-text-xs)" fw={500} style={{ color: 'var(--v-text-tertiary)' }}>
                  {t('users.table.joined')}
                </Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onClick={setEditUser}
              />
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Invite modal */}
      <InviteUserModal
        opened={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => {
          setInviteOpen(false);
          void fetchUsers();
        }}
        roles={roles}
      />

      {/* Edit drawer */}
      <EditUserDrawer
        user={editUser}
        opened={editUser !== null}
        onClose={() => setEditUser(null)}
        onSuccess={() => {
          setEditUser(null);
          void fetchUsers();
        }}
        roles={roles}
      />
    </Stack>
  );
}

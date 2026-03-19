'use client';

/**
 * RoleList — Client component managing the full role management UI.
 *
 * Renders a grid of RoleCard components and orchestrates:
 *   - CreateRoleModal (+ Create role button)
 *   - EditRoleDrawer  (Edit custom roles)
 *   - ConfirmDialog   (Delete confirmation)
 *   - Duplicate (creates a copy via POST)
 *   - View users (navigates to /admin/users?role=<id>)
 *
 * Data flows in from the server component as initial props (SSR), then kept
 * in local state so optimistic UI updates work without a full page reload.
 *
 * Patterns Library §3 (Cards), §8 (Empty states), §10 (Toasts)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Group, SimpleGrid, Stack, Title } from '@mantine/core';
import { IconPlus, IconShieldCheck } from '@tabler/icons-react';
import { RoleCard } from './RoleCard';
import { CreateRoleModal } from './CreateRoleModal';
import { EditRoleDrawer } from './EditRoleDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { t } from '@/lib/i18n';
import { showSuccess, showError } from '@/lib/notifications';
import type { RoleCardRole } from './RoleCard';
import type { CreatedRole } from './CreateRoleModal';
import type { EditRoleRole } from './EditRoleDrawer';

export interface RoleListRole extends RoleCardRole {
  permissions: Array<{ resource: string; action: string; granted: boolean }>;
}

export interface RoleListProps {
  initialRoles: RoleListRole[];
}

export function RoleList({ initialRoles }: RoleListProps) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleListRole[]>(initialRoles);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);

  // Edit drawer state
  const [editRole, setEditRole] = useState<EditRoleRole | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleEdit(id: string) {
    const role = roles.find((r) => r.id === id);
    if (!role) return;
    setEditRole(role);
    setEditOpen(true);
  }

  async function handleDuplicate(id: string) {
    const role = roles.find((r) => r.id === id);
    if (!role) return;

    const copyName = `${role.name} (Copy)`;

    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: copyName,
          description: role.description ?? undefined,
          permissions: role.permissions,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('error.generic'), t('roles.duplicate.errorTitle'));
        return;
      }

      const data = (await response.json()) as { role: CreatedRole };
      setRoles((prev) => [...prev, { ...data.role }]);
      showSuccess(
        t('roles.duplicate.success').replace('{name}', data.role.name),
        t('roles.duplicate.successTitle'),
      );
    } catch {
      showError(t('error.generic'), t('roles.duplicate.errorTitle'));
    }
  }

  function handleViewUsers(id: string) {
    router.push(`/admin/users?role=${id}`);
  }

  function handleDeleteRequest(id: string) {
    setDeleteId(id);
    setDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/admin/roles/${deleteId}`, { method: 'DELETE' });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('error.generic'), t('roles.delete.errorTitle'));
        return;
      }

      setRoles((prev) => prev.filter((r) => r.id !== deleteId));
      showSuccess(t('roles.delete.success'), t('roles.delete.successTitle'));
      setDeleteOpen(false);
      setDeleteId(null);
    } catch {
      showError(t('error.generic'), t('roles.delete.errorTitle'));
    } finally {
      setDeleting(false);
    }
  }

  function handleCreated(role: CreatedRole) {
    setRoles((prev) => [...prev, { ...role }]);
  }

  function handleUpdated(updated: EditRoleRole) {
    setRoles((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  }

  const deleteRole = deleteId ? roles.find((r) => r.id === deleteId) : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="center">
        <Title order={2} fw={500} fz="var(--v-text-xl)" style={{ color: 'var(--v-text-primary)' }}>
          {t('roles.page.title')}
        </Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateOpen(true)}
        >
          {t('roles.create.buttonLabel')}
        </Button>
      </Group>

      {roles.length === 0 ? (
        <EmptyState
          icon={IconShieldCheck}
          message={t('roles.empty.message')}
          actionLabel={t('roles.create.buttonLabel')}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onViewUsers={handleViewUsers}
              onDelete={handleDeleteRequest}
            />
          ))}
        </SimpleGrid>
      )}

      <CreateRoleModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        existingRoles={roles}
      />

      <EditRoleDrawer
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdated={handleUpdated}
        role={editRole}
      />

      <ConfirmDialog
        opened={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t('roles.delete.confirmTitle')}
        message={
          deleteRole
            ? t('roles.delete.confirmMessage').replace('{name}', deleteRole.name)
            : t('roles.delete.confirmMessageGeneric')
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        loading={deleting}
      />
    </Stack>
  );
}

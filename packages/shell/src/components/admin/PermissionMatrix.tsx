'use client';

/**
 * PermissionMatrix — Interactive permission matrix grid.
 *
 * Layout:
 *   Rows    = resource types (from the shared resources list)
 *   Columns = roles (system roles first, then custom)
 *
 * System role columns are read-only (no click handlers).
 * Custom role columns are editable — clicking a badge toggles the permission.
 *
 * Pending changes are held in local state and only committed on Save,
 * which shows a ConfirmDialog with the affected user count.
 *
 * Patterns Library §1 (Tables), §10 (Toasts), §9 (Forms)
 * Design System: Style Guide §4 (Colors), §2 (Typography)
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Divider,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconDownload, IconDeviceFloppy } from '@tabler/icons-react';
import { PermissionCell } from './PermissionCell';
import { PermissionLegend } from './PermissionLegend';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';
import { t } from '@/lib/i18n';
import { showSuccess, showError } from '@/lib/notifications';
import type { BadgeAction } from './PermissionCell';

// ---------------------------------------------------------------------------
// Types matching the API response
// ---------------------------------------------------------------------------

interface PermissionEntry {
  resource: string;
  action: string;
  granted: boolean;
  conditions: Record<string, unknown> | null;
}

interface RoleMatrixEntry {
  id: string;
  name: string;
  isSystem: boolean;
  userCount: number;
  permissions: PermissionEntry[];
}

// Local state: map from roleId → resource → action → granted
type PermissionDraft = Map<string, Map<string, Map<string, boolean>>>;

function buildDraft(roles: RoleMatrixEntry[]): PermissionDraft {
  const draft: PermissionDraft = new Map();
  for (const role of roles) {
    const resourceMap = new Map<string, Map<string, boolean>>();
    for (const p of role.permissions) {
      if (!resourceMap.has(p.resource)) {
        resourceMap.set(p.resource, new Map());
      }
      resourceMap.get(p.resource)!.set(p.action, p.granted);
    }
    draft.set(role.id, resourceMap);
  }
  return draft;
}

function getGranted(draft: PermissionDraft, roleId: string, resource: string, action: string): boolean {
  return draft.get(roleId)?.get(resource)?.get(action) ?? false;
}

function countPendingChanges(
  original: PermissionDraft,
  draft: PermissionDraft,
): number {
  let count = 0;
  for (const [roleId, resourceMap] of draft) {
    for (const [resource, actionMap] of resourceMap) {
      for (const [action, granted] of actionMap) {
        const orig = original.get(roleId)?.get(resource)?.get(action) ?? false;
        if (orig !== granted) count++;
      }
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface PermissionMatrixProps {
  /** Org user count — used to derive affected users in confirm dialog */
  orgUserCount?: number;
}

export function PermissionMatrix({ orgUserCount = 0 }: PermissionMatrixProps) {
  const [roles, setRoles] = useState<RoleMatrixEntry[]>([]);
  const [resourceList, setResourceList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Draft state tracks toggled permissions before save
  const [originalDraft, setOriginalDraft] = useState<PermissionDraft>(new Map());
  const [draft, setDraft] = useState<PermissionDraft>(new Map());

  // Save dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // The custom role being saved (one role at a time in this UX)
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/admin/permissions');
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setFetchError(data.error ?? t('error.generic'));
        return;
      }
      const data = (await response.json()) as {
        roles: RoleMatrixEntry[];
        resources: string[];
      };
      setRoles(data.roles);
      setResourceList(data.resources);
      const d = buildDraft(data.roles);
      setDraft(d);
      setOriginalDraft(buildDraft(data.roles));
    } catch {
      setFetchError(t('error.networkError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMatrix();
  }, [fetchMatrix]);

  // ---------------------------------------------------------------------------
  // Toggle handler
  // ---------------------------------------------------------------------------

  const handleToggle = useCallback(
    (roleId: string, resource: string, action: BadgeAction, currentlyGranted: boolean) => {
      setDraft((prev) => {
        // Deep-copy the affected subtree only
        const next = new Map(prev);
        const resourceMap = new Map(next.get(roleId) ?? new Map<string, Map<string, boolean>>());
        const actionMap = new Map(resourceMap.get(resource) ?? new Map<string, boolean>());
        actionMap.set(action, !currentlyGranted);
        resourceMap.set(resource, actionMap);
        next.set(roleId, resourceMap);
        return next;
      });
      // Track which role has pending changes
      setPendingRoleId(roleId);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Save flow
  // ---------------------------------------------------------------------------

  function handleSaveClick() {
    if (!pendingRoleId) return;
    setSaveOpen(true);
  }

  async function handleSaveConfirm() {
    if (!pendingRoleId) return;
    setSaving(true);

    // Collect only the changed permissions for this role
    const roleResourceMap = draft.get(pendingRoleId);
    if (!roleResourceMap) {
      setSaving(false);
      setSaveOpen(false);
      return;
    }

    const permissions: { resource: string; action: string; granted: boolean }[] = [];
    for (const [resource, actionMap] of roleResourceMap) {
      for (const [action, granted] of actionMap) {
        permissions.push({ resource, action, granted });
      }
    }

    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: pendingRoleId, permissions }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('error.generic'), t('permissions.save.errorTitle'));
        return;
      }

      showSuccess(t('permissions.save.success'), t('permissions.save.successTitle'));
      setSaveOpen(false);
      setPendingRoleId(null);
      // Refresh the matrix to reflect saved state
      await fetchMatrix();
    } catch {
      showError(t('error.generic'), t('permissions.save.errorTitle'));
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  function handleExport() {
    window.open('/api/admin/permissions/export', '_blank');
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const pendingRole = pendingRoleId ? roles.find((r) => r.id === pendingRoleId) : null;
  const affectedUsers = pendingRole?.userCount ?? orgUserCount;
  const pendingChangeCount = countPendingChanges(originalDraft, draft);
  const hasPendingChanges = pendingChangeCount > 0;

  if (fetchError) {
    return (
      <ErrorState
        message={fetchError}
        onRetry={() => void fetchMatrix()}
      />
    );
  }

  return (
    <Stack gap="xl">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Title order={2} fw={500} fz="var(--v-text-xl)" style={{ color: 'var(--v-text-primary)' }}>
          {t('permissions.page.title')}
        </Title>
        <Group gap="sm">
          {hasPendingChanges && (
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSaveClick}
              variant="filled"
            >
              {t('permissions.save.button')}
            </Button>
          )}
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={handleExport}
            variant="outline"
          >
            {t('permissions.export.button')}
          </Button>
        </Group>
      </Group>

      {/* Matrix */}
      {loading ? (
        <Stack gap="xs">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={40} radius="sm" />
          ))}
        </Stack>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Box style={{ minWidth: 600 }}>
            <Table
              withTableBorder
              withColumnBorders
              horizontalSpacing="md"
              verticalSpacing="sm"
              style={{ borderColor: 'var(--v-border-default)' }}
            >
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: 'var(--v-bg-secondary)' }}>
                  <Table.Th
                    style={{
                      color: 'var(--v-text-secondary)',
                      fontWeight: 500,
                      fontSize: 'var(--v-text-sm)',
                      minWidth: 160,
                    }}
                  >
                    {t('permissions.matrix.resourceColumn')}
                  </Table.Th>
                  {roles.map((role) => (
                    <Table.Th
                      key={role.id}
                      style={{
                        color: 'var(--v-text-secondary)',
                        fontWeight: 500,
                        fontSize: 'var(--v-text-sm)',
                        textAlign: 'center',
                        minWidth: 120,
                      }}
                    >
                      <Stack gap={2} align="center">
                        <Text
                          fz="var(--v-text-sm)"
                          fw={500}
                          style={{ color: 'var(--v-text-primary)' }}
                        >
                          {role.name}
                        </Text>
                        {role.isSystem && (
                          <Text fz="var(--v-text-xs)" style={{ color: 'var(--v-text-tertiary)' }}>
                            {t('roles.badge.system')}
                          </Text>
                        )}
                      </Stack>
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {resourceList.map((resource) => (
                  <Table.Tr key={resource}>
                    <Table.Td>
                      <Text
                        fz="var(--v-text-sm)"
                        fw={500}
                        style={{ color: 'var(--v-text-primary)' }}
                      >
                        {resource}
                      </Text>
                    </Table.Td>
                    {roles.map((role) => {
                      // Build cell permissions from draft
                      const cellPermissions = (['read', 'update', 'delete', 'export'] as BadgeAction[]).map((action) => ({
                        action,
                        granted: getGranted(draft, role.id, resource, action),
                        conditions: role.permissions.find(
                          (p) => p.resource === resource && p.action === action,
                        )?.conditions ?? null,
                      }));

                      return (
                        <Table.Td key={role.id}>
                          <PermissionCell
                            permissions={cellPermissions}
                            isSystem={role.isSystem}
                            onToggle={
                              role.isSystem
                                ? undefined
                                : (action, currentlyGranted) => {
                                    handleToggle(role.id, resource, action, currentlyGranted);
                                  }
                            }
                          />
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Box>
      )}

      <Divider style={{ borderColor: 'var(--v-border-default)' }} />

      {/* Legend */}
      <PermissionLegend />

      {/* Save confirmation dialog */}
      <ConfirmDialog
        opened={saveOpen}
        onClose={() => {
          setSaveOpen(false);
        }}
        onConfirm={() => void handleSaveConfirm()}
        title={t('permissions.save.confirmTitle')}
        message={
          affectedUsers > 0
            ? t('permissions.save.confirmMessage').replace('{count}', String(affectedUsers))
            : t('permissions.save.confirmMessageNoUsers')
        }
        confirmLabel={t('permissions.save.confirmLabel')}
        cancelLabel={t('common.cancel')}
        variant="warning"
        loading={saving}
      />
    </Stack>
  );
}

'use client';

/**
 * TenantList — Admin page body for tenant management.
 *
 * Fetches tenants from GET /api/admin/tenants and renders a grid of TenantCards.
 * Includes "+ Create tenant" button, archive confirmation, and tenant switching.
 *
 * Follows the skeleton → content → error loading state pattern (Patterns Library §6).
 */

import { useCallback, useEffect, useState } from 'react';
import { Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconBuildings } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { showError, showSuccess } from '../../lib/notifications';
import { TenantCard, type TenantCardData } from './TenantCard';
import { CreateTenantModal } from './CreateTenantModal';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { EmptyState } from '../shared/EmptyState';
import { ErrorState } from '../shared/ErrorState';
import { CardListSkeleton } from '../shared/CardListSkeleton';

/** Shape returned by GET /api/admin/tenants */
interface ApiTenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'ACTIVE' | 'SANDBOX';
  region: string | null;
  dbIsolationMode: string;
  createdAt: string;
  _count: { userRoles: number };
}

function apiTenantToCardData(tenant: ApiTenant): TenantCardData {
  return {
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    status: tenant.status,
    region: tenant.region,
    dbIsolationMode: tenant.dbIsolationMode,
    createdAt: tenant.createdAt,
    userCount: tenant._count.userRoles,
  };
}

export interface TenantListProps {
  /** The current active tenant id from the session. */
  currentTenantId: string | null;
}

export function TenantList({ currentTenantId }: TenantListProps) {
  const [tenants, setTenants] = useState<TenantCardData[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(currentTenantId);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Create tenant modal
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  // Archive confirmation
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Switching loading state
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/tenants');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = (await res.json()) as { tenants: ApiTenant[] };
      setTenants(json.tenants.map(apiTenantToCardData));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const handleCreated = useCallback(
    (tenant: TenantCardData) => {
      setTenants((prev) => [...prev, tenant]);
    },
    [],
  );

  const handleSwitch = useCallback(async (id: string) => {
    setSwitchingId(id);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/switch`, { method: 'POST' });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        showError(json.error ?? t('error.generic'), t('tenants.switch.errorTitle'));
        return;
      }
      setActiveTenantId(id);
      showSuccess(t('tenants.switch.success'));
    } catch {
      showError(t('error.generic'), t('tenants.switch.errorTitle'));
    } finally {
      setSwitchingId(null);
    }
  }, []);

  const handleArchiveRequest = useCallback((id: string) => {
    setArchiveId(id);
  }, []);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveId) return;
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${archiveId}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        showError(json.error ?? t('error.generic'), t('tenants.archive.errorTitle'));
        return;
      }
      setTenants((prev) => prev.filter((item) => item.id !== archiveId));
      showSuccess(t('tenants.archive.success'));
      setArchiveId(null);
    } catch {
      showError(t('error.generic'), t('tenants.archive.errorTitle'));
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveId]);

  const handleEdit = useCallback((_id: string) => {
    // Edit drawer is Phase 1+ — the overflow menu wires this up when implemented.
    showError('Edit tenant is not yet implemented.');
  }, []);

  return (
    <Stack gap="lg">
      {/* Page header */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} fz="var(--v-text-xl)" fw={500} c="var(--v-text-primary)">
            {t('tenants.title')}
          </Title>
          <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)" mt={4}>
            {t('tenants.subtitle')}
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} stroke={1.5} />}
          onClick={openCreate}
        >
          {t('tenants.create.button')}
        </Button>
      </Group>

      {/* Loading state */}
      {status === 'loading' && <CardListSkeleton cards={3} />}

      {/* Error state */}
      {status === 'error' && (
        <ErrorState
          message={t('tenants.loadError')}
          onRetry={() => { void loadTenants(); }}
        />
      )}

      {/* Empty state */}
      {status === 'ready' && tenants.length === 0 && (
        <EmptyState
          icon={IconBuildings}
          message={t('tenants.empty')}
          actionLabel={t('tenants.create.button')}
          onAction={openCreate}
        />
      )}

      {/* Tenant cards */}
      {status === 'ready' && tenants.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              isCurrent={tenant.id === activeTenantId}
              onSwitch={(id) => {
                if (switchingId === null) {
                  void handleSwitch(id);
                }
              }}
              onEdit={handleEdit}
              onArchive={handleArchiveRequest}
            />
          ))}
        </SimpleGrid>
      )}

      {/* Create tenant modal */}
      <CreateTenantModal
        opened={createOpened}
        onClose={closeCreate}
        onCreated={(tenant) => {
          handleCreated(tenant);
        }}
      />

      {/* Archive confirmation dialog */}
      <ConfirmDialog
        opened={archiveId !== null}
        onClose={() => { setArchiveId(null); }}
        onConfirm={() => { void handleArchiveConfirm(); }}
        title={t('tenants.archive.title')}
        message={t('tenants.archive.message')}
        confirmLabel={t('tenants.archive.confirm')}
        variant="destructive"
        loading={archiveLoading}
      />
    </Stack>
  );
}

'use client';

/**
 * SsoProviderList — Client-side list of configured SSO identity providers.
 * US-019, AC-1/AC-2/AC-3/AC-4/AC-5/AC-6.
 *
 * Fetches providers from GET /api/settings/sso, renders SsoProviderCard for each,
 * shows EmptyState when none exist, and opens SsoProviderModal for add/edit.
 * Handles delete confirmation via ConfirmDialog.
 *
 * Design: Patterns Library §8 (Empty states), §3 (Cards), §10 (Toasts).
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React from 'react';
import { Button, Checkbox, Group, Stack, Text, Title } from '@mantine/core';
import { IconPlus, IconShieldCheck } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { showError, showSuccess } from '../../lib/notifications';
import { CardListSkeleton } from '../shared/CardListSkeleton';
import { EmptyState } from '../shared/EmptyState';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { SsoProviderCard } from './SsoProviderCard';
import { SsoProviderModal } from './SsoProviderModal';
import type { SsoProviderConfig, CreateSsoProviderInput, SsoProviderListResponse } from '../../types/sso-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; providers: SsoProviderConfig[] }
  | { status: 'error' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SsoProviderList() {
  const [loadState, setLoadState] = React.useState<LoadState>({ status: 'loading' });
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingProvider, setEditingProvider] = React.useState<SsoProviderConfig | undefined>(undefined);
  const [deletingProvider, setDeletingProvider] = React.useState<SsoProviderConfig | undefined>(undefined);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [requireSso, setRequireSso] = React.useState(false);

  // Fetch providers on mount.
  React.useEffect(() => {
    void fetchProviders();
  }, []);

  async function fetchProviders() {
    setLoadState({ status: 'loading' });
    try {
      const res = await fetch('/api/settings/sso');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SsoProviderListResponse;
      setLoadState({ status: 'loaded', providers: data.providers });
    } catch {
      setLoadState({ status: 'error' });
    }
  }

  function handleAddProvider() {
    setEditingProvider(undefined);
    setModalOpen(true);
  }

  function handleEditProvider(provider: SsoProviderConfig) {
    setEditingProvider(provider);
    setModalOpen(true);
  }

  function handleTestProvider(provider: SsoProviderConfig) {
    // Test is handled inside SsoProviderModal for edit mode.
    // For card-level quick test, trigger the same endpoint.
    void (async () => {
      try {
        const res = await fetch(`/api/settings/sso/${provider.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _action: 'test' }),
        });
        if (res.ok) {
          showSuccess(t('sso.config.toast.testSuccess'));
        } else {
          showError(t('sso.config.toast.testFailed'));
        }
      } catch {
        showError(t('sso.config.toast.testFailed'));
      }
    })();
  }

  async function handleSetDefault(provider: SsoProviderConfig) {
    try {
      const res = await fetch(`/api/settings/sso/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccess(t('sso.config.toast.setDefault'));
      await fetchProviders();
    } catch {
      showError(t('error.generic'));
    }
  }

  function handleDeleteProvider(provider: SsoProviderConfig) {
    setDeletingProvider(provider);
  }

  async function handleConfirmDelete() {
    if (!deletingProvider) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/settings/sso/${deletingProvider.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccess(t('sso.config.toast.deleted'));
      setDeletingProvider(undefined);
      await fetchProviders();
    } catch {
      showError(t('error.generic'));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveProvider(input: CreateSsoProviderInput, id?: string) {
    const isEdit = id !== undefined;
    const url = isEdit ? `/api/settings/sso/${id}` : '/api/settings/sso';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await fetchProviders();
  }

  const providers =
    loadState.status === 'loaded' ? loadState.providers : [];

  return (
    <Stack gap="xl">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Title order={2} fz="var(--v-text-xl)" fw={500} c="var(--v-text-primary)">
          {t('sso.config.title')}
        </Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleAddProvider}
          style={{ backgroundColor: 'var(--v-accent-primary)' }}
        >
          {t('sso.config.addProvider')}
        </Button>
      </Group>

      {/* Provider list — skeleton → content → error */}
      {loadState.status === 'loading' && <CardListSkeleton cards={2} />}

      {loadState.status === 'error' && (
        <Text fz="var(--v-text-md)" c="var(--v-status-error)">
          {t('error.generic')}
        </Text>
      )}

      {loadState.status === 'loaded' && providers.length === 0 && (
        <EmptyState
          icon={IconShieldCheck}
          message={t('sso.config.empty.message')}
          actionLabel={t('sso.config.addProvider')}
          onAction={handleAddProvider}
        />
      )}

      {loadState.status === 'loaded' && providers.length > 0 && (
        <Stack gap="md">
          {providers.map((provider) => (
            <SsoProviderCard
              key={provider.id}
              provider={provider}
              onEdit={handleEditProvider}
              onTest={handleTestProvider}
              onSetDefault={handleSetDefault}
              onDelete={handleDeleteProvider}
            />
          ))}
        </Stack>
      )}

      {/* Enforcement toggle — AC-6 */}
      <Stack gap="xs">
        <Text fz="var(--v-text-sm)" fw={500} c="var(--v-text-primary)">
          {t('sso.config.enforcement.title')}
        </Text>
        <Checkbox
          label={t('sso.config.enforcement.requireSso')}
          description={t('sso.config.enforcement.description')}
          checked={requireSso}
          onChange={(e) => setRequireSso(e.currentTarget.checked)}
          styles={{
            label: { color: 'var(--v-text-primary)', fontSize: 'var(--v-text-sm)' },
            description: { color: 'var(--v-text-tertiary)', fontSize: 'var(--v-text-xs)' },
          }}
        />
      </Stack>

      {/* Add / edit modal */}
      <SsoProviderModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        provider={editingProvider}
        onSave={handleSaveProvider}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        opened={deletingProvider !== undefined}
        onClose={() => setDeletingProvider(undefined)}
        onConfirm={handleConfirmDelete}
        title={t('sso.config.delete.title')}
        message={t('sso.config.delete.message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        loading={isDeleting}
      />
    </Stack>
  );
}

'use client';

/**
 * DbConnectionList — Card list of database connections.
 *
 * Implements US-016 AC-2, AC-3, AC-6.
 * - Shows EmptyState when no connections exist.
 * - "+ Add new" button opens the add modal.
 * - Polls connection health every 60s.
 * - Manages add/edit/delete modal state.
 */

import { useState, useEffect, useCallback } from 'react';
import { Group, Stack, Button, Title } from '@mantine/core';
import { IconDatabase } from '@tabler/icons-react';
import type { DbConnection } from '@vastu/shared/types';
import { t } from '../../lib/i18n';
import { showSuccess, showError } from '../../lib/notifications';
import { EmptyState } from '../shared/EmptyState';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { DbConnectionCard } from './DbConnectionCard';
import { DbConnectionModal } from './DbConnectionModal';

export interface DbConnectionListProps {
  initialConnections: DbConnection[];
}

export function DbConnectionList({ initialConnections }: DbConnectionListProps) {
  const [connections, setConnections] = useState<DbConnection[]>(initialConnections);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DbConnection | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/db-connections');
      if (!res.ok) return;
      const data = (await res.json()) as { connections: DbConnection[] };
      setConnections(data.connections);
    } catch {
      // Silently ignore polling errors — the last known state remains visible
    }
  }, []);

  // Poll health every 60 seconds (AC-6)
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchConnections();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchConnections]);

  function handleAddNew() {
    setEditingConnection(null);
    setModalOpen(true);
  }

  function handleEdit(connection: DbConnection) {
    setEditingConnection(connection);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditingConnection(null);
  }

  async function handleSaved(saved: DbConnection) {
    setConnections((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [saved, ...prev];
    });
    handleModalClose();
    showSuccess(
      editingConnection ? t('databases.updated') : t('databases.created'),
    );
  }

  function handleRequestDelete(id: string) {
    setDeletingId(id);
  }

  function handleCancelDelete() {
    setDeletingId(null);
  }

  async function handleConfirmDelete() {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/settings/db-connections/${deletingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        showError(body.error ?? t('error.generic'));
        return;
      }
      setConnections((prev) => prev.filter((c) => c.id !== deletingId));
      showSuccess(t('databases.deleted'));
      setDeletingId(null);
    } catch {
      showError(t('error.generic'));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleTest(id: string) {
    try {
      const res = await fetch(`/api/settings/db-connections/${id}/test`, {
        method: 'POST',
      });
      const body = (await res.json()) as { success: boolean; latencyMs?: number; error?: string };
      if (body.success) {
        showSuccess(`${t('databases.testSuccess')} (${body.latencyMs ?? 0}ms)`);
        // Refresh list to get updated healthStatus
        void fetchConnections();
      } else {
        showError(body.error ?? t('databases.testError'));
        void fetchConnections();
      }
    } catch {
      showError(t('databases.testError'));
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title
          order={2}
          fz="var(--v-text-lg)"
          fw="var(--v-font-medium)"
          style={{ color: 'var(--v-text-primary)' }}
        >
          {t('databases.title')}
        </Title>
        <Button
          variant="filled"
          size="sm"
          onClick={handleAddNew}
          style={{ backgroundColor: 'var(--v-accent-primary)' }}
        >
          {t('databases.addNew')}
        </Button>
      </Group>

      {connections.length === 0 ? (
        <EmptyState
          icon={IconDatabase}
          message={t('databases.empty.message')}
          actionLabel={t('databases.empty.action')}
          onAction={handleAddNew}
        />
      ) : (
        <Stack gap="md">
          {connections.map((connection) => (
            <DbConnectionCard
              key={connection.id}
              connection={connection}
              onEdit={() => handleEdit(connection)}
              onTest={() => handleTest(connection.id)}
              onDelete={() => handleRequestDelete(connection.id)}
            />
          ))}
        </Stack>
      )}

      <DbConnectionModal
        key={editingConnection?.id ?? 'new'}
        opened={modalOpen}
        connection={editingConnection}
        onClose={handleModalClose}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        opened={deletingId !== null}
        onClose={handleCancelDelete}
        onConfirm={() => { void handleConfirmDelete(); }}
        title={t('databases.delete.title')}
        message={t('databases.delete.message')}
        confirmLabel={t('databases.delete.confirm')}
        variant="destructive"
        loading={deleteLoading}
      />
    </Stack>
  );
}

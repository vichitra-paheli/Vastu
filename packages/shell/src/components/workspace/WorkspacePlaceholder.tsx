'use client';

/**
 * WorkspacePlaceholder — Shown at /workspace during Phase 0.
 *
 * The full workspace (Dockview, page templates, view engine) ships in Phase 1.
 * This component uses EmptyState to communicate that clearly.
 */

import { IconLayout } from '@tabler/icons-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { t } from '@/lib/i18n';

export function WorkspacePlaceholder() {
  return (
    <EmptyState
      icon={IconLayout}
      message={t('workspace.placeholder.message')}
    />
  );
}

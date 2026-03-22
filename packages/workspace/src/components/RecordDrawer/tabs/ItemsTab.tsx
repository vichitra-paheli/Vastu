'use client';

/**
 * ItemsTab — sub-records table for the record detail drawer.
 *
 * Displays line items / sub-records for the current record in a compact
 * VastuTable. Shows an empty state with "Add item" when there are no items.
 *
 * Implements US-128c (Items tab).
 */

import React, { useState } from 'react';
import { Button } from '@mantine/core';
import { IconList } from '@tabler/icons-react';
import { VastuTable } from '../../VastuTable/VastuTable';
import { EmptyState } from '../../EmptyState/EmptyState';
import type { VastuColumn } from '../../VastuTable/types';
import { t } from '../../../lib/i18n';
import classes from './ItemsTab.module.css';

interface SubRecord extends Record<string, unknown> {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

interface ItemsTabProps {
  recordId: string;
  /**
   * Optional list of sub-records to display.
   * When not provided the component renders an empty state.
   */
  items?: SubRecord[];
  loading?: boolean;
  onAddItem?: (parentRecordId: string) => void;
}

const COLUMNS: VastuColumn<SubRecord>[] = [
  {
    id: 'title',
    label: t('drawer.items.columnTitle'),
    accessorKey: 'title',
    dataType: 'text',
    width: 200,
  },
  {
    id: 'status',
    label: t('drawer.items.columnStatus'),
    accessorKey: 'status',
    dataType: 'enum',
    width: 100,
  },
  {
    id: 'updatedAt',
    label: t('drawer.items.columnUpdated'),
    accessorKey: 'updatedAt',
    dataType: 'date',
    width: 120,
  },
];

export function ItemsTab({ recordId, items = [], loading = false, onAddItem }: ItemsTabProps) {
  const [localItems] = useState<SubRecord[]>(items);

  const isEmpty = !loading && localItems.length === 0;

  return (
    <div className={classes.root}>
      {/* Header row with Add button */}
      <div className={classes.toolbar}>
        <span className={classes.count} aria-live="polite">
          {loading ? '' : t('drawer.items.count', { count: String(localItems.length) })}
        </span>
        <Button
          size="xs"
          variant="light"
          onClick={() => onAddItem?.(recordId)}
          aria-label={t('drawer.items.addAriaLabel')}
        >
          {t('drawer.items.add')}
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<IconList />}
          message={t('drawer.items.empty')}
          actionLabel={t('drawer.items.add')}
          onAction={() => onAddItem?.(recordId)}
        />
      ) : (
        <div className={classes.tableWrapper}>
          <VastuTable<SubRecord>
            data={localItems}
            columns={COLUMNS}
            loading={loading}
            height={300}
            rowHeight={32}
          />
        </div>
      )}
    </div>
  );
}

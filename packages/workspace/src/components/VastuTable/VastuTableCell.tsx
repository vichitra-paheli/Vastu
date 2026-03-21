'use client';

/**
 * VastuTableCell — cell component with type-aware formatting.
 *
 * Renders cell content based on the column's dataType:
 * - text/enum: TruncatedText
 * - number: right-aligned tabular numerals
 * - date: locale-formatted date string
 * - boolean: checkmark / cross icon
 * - badge: coloured pill
 * - custom: delegates to renderCell
 *
 * Right-click triggers VastuContextMenu with copy/filter options.
 * Implements US-112 (AC-8, AC-9).
 */

import React from 'react';
import type { Cell } from '@tanstack/react-table';
import { IconCheck, IconX } from '@tabler/icons-react';
import { TruncatedText } from '../TruncatedText';
import { t } from '../../lib/i18n';
import type { VastuColumn, CellDataType } from './types';
import classes from './VastuTable.module.css';

export interface VastuTableCellProps<TData extends Record<string, unknown>> {
  cell: Cell<TData, unknown>;
  width: number;
  height: number;
  onContextMenuOpen?: (params: {
    x: number;
    y: number;
    columnId: string;
    rowId: string;
    value: unknown;
  }) => void;
}

/**
 * Format a cell value as a locale date string.
 * Returns an empty string when the value cannot be parsed.
 */
function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a cell value as a locale number string.
 * Returns an empty string when the value is not numeric.
 */
function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (isNaN(n)) return String(value);
  return n.toLocaleString();
}

/**
 * Render the cell content based on dataType.
 * When renderCell is provided on the column def, it takes precedence.
 */
function renderCellContent<TData extends Record<string, unknown>>(
  value: unknown,
  row: TData,
  col: VastuColumn<TData>,
): React.ReactNode {
  if (col.renderCell) {
    return col.renderCell(value, row);
  }

  const dataType: CellDataType = col.dataType ?? 'text';

  switch (dataType) {
    case 'number': {
      return (
        <span>
          {formatNumber(value)}
        </span>
      );
    }

    case 'date': {
      return (
        <TruncatedText>
          {formatDate(value)}
        </TruncatedText>
      );
    }

    case 'boolean': {
      if (value === null || value === undefined) return null;
      const boolVal = value === true || value === 'true' || value === 1 || value === '1';
      return boolVal ? (
        <span className={classes.boolTrue} aria-label={t('table.cell.boolean.true')}>
          <IconCheck size={14} aria-hidden="true" />
        </span>
      ) : (
        <span className={classes.boolFalse} aria-label={t('table.cell.boolean.false')}>
          <IconX size={14} aria-hidden="true" />
        </span>
      );
    }

    case 'badge': {
      const strVal = value !== null && value !== undefined ? String(value) : '';
      if (!strVal) return null;
      return (
        <span className={classes.badge} title={strVal}>
          {strVal}
        </span>
      );
    }

    case 'enum':
    case 'text':
    default: {
      const strVal = value !== null && value !== undefined ? String(value) : '';
      return (
        <TruncatedText>
          {strVal}
        </TruncatedText>
      );
    }
  }
}

function VastuTableCellInner<TData extends Record<string, unknown>>({
  cell,
  width,
  height,
  onContextMenuOpen,
}: VastuTableCellProps<TData>) {
  const col = cell.column.columnDef.meta as VastuColumn<TData> | undefined;
  const value = cell.getValue();
  const row = cell.row.original;
  const dataType: CellDataType = col?.dataType ?? 'text';

  const tdClasses = [
    classes.td,
    dataType === 'number' ? classes.cellNumber : '',
    dataType === 'boolean' ? classes.cellBoolean : '',
    dataType === 'badge' ? classes.cellBadge : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    onContextMenuOpen?.({
      x: e.clientX,
      y: e.clientY,
      columnId: cell.column.id,
      rowId: cell.row.id,
      value,
    });
  }

  return (
    <div
      role="cell"
      className={tdClasses}
      style={{ width, height }}
      data-context="cell"
      data-context-type="cell"
      data-context-value={value !== null && value !== undefined ? String(value) : ''}
      onContextMenu={handleContextMenu}
      data-column-id={cell.column.id}
      data-row-id={cell.row.id}
    >
      {col ? renderCellContent(value, row, col) : null}
    </div>
  );
}

export const VastuTableCell = React.memo(VastuTableCellInner) as typeof VastuTableCellInner;

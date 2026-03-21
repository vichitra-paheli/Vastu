'use client';

/**
 * VastuTableHeader — column headers with sort indicators, resize handles, and drag-to-reorder.
 *
 * Features:
 * - Click to sort (toggle asc/desc). Shift-click for multi-sort.
 * - Sort direction icon and rank badge for multi-sort.
 * - Resize handle at the right edge (drag to resize).
 * - Drag handle at the left edge (drag to reorder).
 * - Right-click → context menu with Sort Ascending / Descending / Remove / Filter / Hide options.
 *
 * Implements US-112 (AC-3, AC-4, AC-5, AC-7).
 */

import React from 'react';
import type { Header, Table } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { IconArrowUp, IconArrowDown, IconArrowsSort, IconGripVertical } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { ContextMenuItem } from '../ContextMenu/ContextMenuItem';
import { ContextMenuDivider } from '../ContextMenu/ContextMenuDivider';
import type { VastuColumn } from './types';
import classes from './VastuTable.module.css';

export interface VastuTableHeaderProps<TData extends Record<string, unknown>> {
  table: Table<TData>;
  /** Called when user drags a column over another to reorder. */
  onColumnReorder?: (dragColumnId: string, overColumnId: string) => void;
  /** Called when user wants to hide a column via context menu. */
  onHideColumn?: (columnId: string) => void;
  /** Called when user wants to add a filter on a column. */
  onFilterColumn?: (columnId: string) => void;
}

function SortIcon({ sorted, canSort }: { sorted: false | 'asc' | 'desc'; canSort: boolean }) {
  if (!canSort) return null;
  if (!sorted) {
    return (
      <span className={`${classes.sortIcon} ${classes.sortIconInactive}`} aria-hidden="true">
        <IconArrowsSort size={12} />
      </span>
    );
  }
  return (
    <span className={classes.sortIcon} aria-hidden="true">
      {sorted === 'asc' ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />}
    </span>
  );
}

function VastuTableHeaderInner<TData extends Record<string, unknown>>({
  table,
  onColumnReorder,
  onHideColumn,
  onFilterColumn,
}: VastuTableHeaderProps<TData>) {
  const [dragOverColumnId, setDragOverColumnId] = React.useState<string | null>(null);

  // ─── Header context menu rendering ──────────────────────────────────
  function renderHeaderContextMenu(contextType: string, contextValue: string) {
    if (contextType !== 'header') return null;

    const column = table.getColumn(contextValue);
    if (!column) return null;

    const sorted = column.getIsSorted();
    const canSort = column.getCanSort();
    const canHide = column.getCanHide();

    return (
      <>
        {canSort && (
          <>
            <ContextMenuItem
              label={t('contextMenu.header.sortAscending')}
              icon={<IconArrowUp size={14} />}
              onSelect={() => column.toggleSorting(false)}
            />
            <ContextMenuItem
              label={t('contextMenu.header.sortDescending')}
              icon={<IconArrowDown size={14} />}
              onSelect={() => column.toggleSorting(true)}
            />
            {sorted && (
              <ContextMenuItem
                label={t('contextMenu.header.removeSort')}
                onSelect={() => column.clearSorting()}
              />
            )}
            <ContextMenuDivider />
          </>
        )}
        <ContextMenuItem
          label={t('contextMenu.header.filterColumn')}
          onSelect={() => onFilterColumn?.(contextValue)}
        />
        <ContextMenuItem
          label={t('contextMenu.header.autoFitWidth')}
          onSelect={() => {
            /* Auto-fit width: reset to default */
            column.resetSize();
          }}
        />
        {canHide && (
          <>
            <ContextMenuDivider />
            <ContextMenuItem
              label={t('contextMenu.header.hideColumn')}
              onSelect={() => {
                onHideColumn?.(contextValue);
                column.toggleVisibility(false);
              }}
            />
          </>
        )}
      </>
    );
  }

  return (
    <div className={classes.thead} role="rowgroup">
      {table.getHeaderGroups().map((headerGroup) => (
        <ContextMenu
          key={headerGroup.id}
          className={classes.headerRow}
          renderMenu={(ctx) => renderHeaderContextMenu(ctx.contextType, ctx.contextValue)}
        >
          {/* Selection checkbox header */}
          {headerGroup.headers.map((header) => {
            if (header.id === '__selection__') {
              return (
                <div
                  key={header.id}
                  role="columnheader"
                  className={classes.checkboxTh}
                  aria-label={t('table.header.selectAll')}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              );
            }

            return (
              <HeaderCell
                key={header.id}
                header={header}
                dragOverColumnId={dragOverColumnId}
                setDragOverColumnId={setDragOverColumnId}
                onColumnReorder={onColumnReorder}
              />
            );
          })}
        </ContextMenu>
      ))}
    </div>
  );
}

interface HeaderCellProps<TData extends Record<string, unknown>> {
  header: Header<TData, unknown>;
  dragOverColumnId: string | null;
  setDragOverColumnId: (id: string | null) => void;
  onColumnReorder?: (dragColumnId: string, overColumnId: string) => void;
}

function HeaderCell<TData extends Record<string, unknown>>({
  header,
  dragOverColumnId,
  setDragOverColumnId,
  onColumnReorder,
}: HeaderCellProps<TData>) {
  const column = header.column;
  const sorted = column.getIsSorted();
  const canSort = column.getCanSort();
  const sortIndex = column.getSortIndex();
  const isMultiSort = sortIndex > 0;
  const meta = column.columnDef.meta as VastuColumn<TData> | undefined;
  const canReorder = meta?.reorderable !== false;
  const isDragOver = dragOverColumnId === column.id;

  const thClasses = [
    classes.th,
    canSort ? classes.thSortable : '',
    sorted ? classes.thSortActive : '',
    isDragOver ? classes.thDragOver : '',
  ]
    .filter(Boolean)
    .join(' ');

  // ─── Click: toggle sort ──────────────────────────────────────────
  function handleClick(e: React.MouseEvent) {
    if (!canSort) return;
    column.toggleSorting(undefined, e.shiftKey);
  }

  // ─── Keyboard: Enter/Space to toggle sort ────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!canSort) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      column.toggleSorting(undefined, e.shiftKey);
    }
  }

  // ─── Drag-to-reorder ────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', column.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(column.id);
  }

  function handleDragLeave() {
    setDragOverColumnId(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dragColumnId = e.dataTransfer.getData('text/plain');
    if (dragColumnId && dragColumnId !== column.id) {
      onColumnReorder?.(dragColumnId, column.id);
    }
    setDragOverColumnId(null);
  }

  function handleDragEnd() {
    setDragOverColumnId(null);
  }

  // Determine whether to show the sort rank for multi-sort scenarios
  const showSortRank = sorted && sortIndex >= 0;

  return (
    <div
      role="columnheader"
      className={thClasses}
      style={{ width: header.getSize() }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={canSort ? 0 : undefined}
      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
      data-context="header"
      data-context-type="header"
      data-context-value={column.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag handle */}
      {canReorder && (
        <span
          className={classes.dragHandle}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          aria-label={t('table.header.dragToReorder')}
          onClick={(e) => e.stopPropagation()}
        >
          <IconGripVertical size={12} />
        </span>
      )}

      {/* Column label */}
      <span className={classes.thLabel}>
        {typeof column.columnDef.header === 'string'
          ? column.columnDef.header
          : column.id}
      </span>

      {/* Sort icon */}
      <SortIcon sorted={sorted} canSort={canSort} />

      {/* Multi-sort rank badge */}
      {showSortRank && isMultiSort && (
        <span className={classes.sortRank} aria-hidden="true">
          {sortIndex + 1}
        </span>
      )}

      {/* Resize handle */}
      {column.getCanResize() && (
        <div
          className={`${classes.resizeHandle} ${
            header.column.getIsResizing() ? classes.resizeHandleActive : ''
          }`}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onClick={(e) => e.stopPropagation()}
          aria-label={t('table.header.resizeColumn')}
          role="separator"
          aria-orientation="vertical"
        />
      )}
    </div>
  );
}

export const VastuTableHeader = React.memo(VastuTableHeaderInner) as typeof VastuTableHeaderInner;

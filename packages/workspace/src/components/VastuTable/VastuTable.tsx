'use client';

/**
 * VastuTable — reusable data table with virtual scrolling, sorting, resizing,
 * column reordering, row selection, and filter/view store integration.
 *
 * Architecture:
 * - TanStack Table (@tanstack/react-table) for column management, sorting,
 *   resizing, and row model.
 * - TanStack Virtual (@tanstack/react-virtual) for row virtualization.
 * - FilterEngine for client-side row filtering.
 * - viewStore for persisting sort/column/pagination state.
 *
 * Loading state sequence: skeleton → content → error (per patterns library).
 *
 * Implements US-112 (AC-1 through AC-12).
 * Updated in US-126: table-specific keyboard shortcuts (j/k/o/x/[/]).
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { IconTableOff } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { ShortcutDefinition } from '../../hooks/useKeyboardShortcuts';
import { ContextMenuCloseContext } from '../ContextMenu/ContextMenu';
import { ContextMenuItem } from '../ContextMenu/ContextMenuItem';
import { ContextMenuDivider } from '../ContextMenu/ContextMenuDivider';
import { EmptyState } from '../EmptyState/EmptyState';
import { VastuTableHeader } from './VastuTableHeader';
import { VastuTableRow } from './VastuTableRow';
import { useVastuTable } from './useVastuTable';
import type { VastuTableProps } from './types';
import classes from './VastuTable.module.css';
import contextMenuClasses from '../ContextMenu/ContextMenu.module.css';

/** Number of skeleton rows shown during loading state. */
const SKELETON_ROW_COUNT = 8;

/** Padding between menu and viewport edge. */
const VIEWPORT_PADDING = 8;

function VastuTableInner<TData extends Record<string, unknown>>({
  data,
  columns,
  viewId: _viewId,
  filterRoot,
  loading = false,
  error = null,
  sourcePageId,
  sourcePageName,
  onSortChange,
  onColumnSizingChange,
  onColumnOrderChange,
  onColumnVisibilityChange,
  onRowSelectionChange,
  onRowClick,
  onCopyCellValue,
  onFilterToValue,
  getRowId,
  height,
  rowHeight = 36,
  overscan = 5,
  columnVisibility,
  sorting,
  columnSizing,
  columnOrder,
  className,
  ariaLabel,
}: VastuTableProps<TData>) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  /** Ref on the root table container — used as context for table-scoped shortcuts. */
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // ─── Focused row index for keyboard navigation ────────────────────────
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1);

  // ─── Cell context menu state ─────────────────────────────────────────
  const [cellMenu, setCellMenu] = React.useState<{
    x: number;
    y: number;
    columnId: string;
    rowId: string;
    value: unknown;
  } | null>(null);

  // ─── TanStack Table instance ─────────────────────────────────────────
  const { table, allRows, columnOrderState } = useVastuTable({
    data,
    columns,
    filterRoot,
    getRowId,
    onSortChange,
    onColumnSizingChange,
    onColumnOrderChange,
    onColumnVisibilityChange,
    onRowSelectionChange,
    sorting,
    columnSizing,
    columnOrder,
    columnVisibility,
  });

  // ─── Table keyboard shortcuts ─────────────────────────────────────────
  // Scoped to tableContainerRef — only fire when the table has focus.

  /**
   * Opens the currently focused row by simulating a click on it.
   * Shared between the 'o' and 'Enter' shortcut handlers.
   */
  const openFocusedRow = React.useCallback(() => {
    if (focusedRowIndex >= 0 && focusedRowIndex < allRows.length) {
      const row = allRows[focusedRowIndex];
      if (row) {
        const rowEl = scrollContainerRef.current?.querySelector<HTMLElement>(
          `[data-row-id="${row.id}"]`,
        );
        rowEl?.click();
      }
    }
  }, [focusedRowIndex, allRows]);

  const tableShortcuts = React.useMemo<ShortcutDefinition[]>(
    () => [
      {
        key: 'j',
        group: 'Table',
        description: t('shortcuts.table.nextRow'),
        contextRef: tableContainerRef,
        handler: () => {
          setFocusedRowIndex((prev) => {
            const next = prev + 1;
            return next < allRows.length ? next : prev;
          });
        },
      },
      {
        key: 'k',
        group: 'Table',
        description: t('shortcuts.table.prevRow'),
        contextRef: tableContainerRef,
        handler: () => {
          setFocusedRowIndex((prev) => (prev > 0 ? prev - 1 : 0));
        },
      },
      {
        key: 'o',
        group: 'Table',
        description: t('shortcuts.table.openRow'),
        contextRef: tableContainerRef,
        handler: openFocusedRow,
      },
      {
        key: 'Enter',
        group: 'Table',
        description: t('shortcuts.table.openRow'),
        contextRef: tableContainerRef,
        handler: openFocusedRow,
      },
      {
        key: 'x',
        group: 'Table',
        description: t('shortcuts.table.toggleSelection'),
        contextRef: tableContainerRef,
        handler: () => {
          if (focusedRowIndex >= 0 && focusedRowIndex < allRows.length) {
            allRows[focusedRowIndex]?.toggleSelected();
          }
        },
      },
      {
        key: '[',
        group: 'Table',
        description: t('shortcuts.table.prevPage'),
        contextRef: tableContainerRef,
        handler: () => {
          if (table.getCanPreviousPage()) table.previousPage();
        },
      },
      {
        key: ']',
        group: 'Table',
        description: t('shortcuts.table.nextPage'),
        contextRef: tableContainerRef,
        handler: () => {
          if (table.getCanNextPage()) table.nextPage();
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRows, focusedRowIndex, openFocusedRow, table],
  );

  useKeyboardShortcuts(tableShortcuts);

  // ─── Column reorder handler ──────────────────────────────────────────
  function handleColumnReorder(dragColumnId: string, overColumnId: string) {
    const currentOrder =
      columnOrderState.length > 0
        ? [...columnOrderState]
        : table.getAllLeafColumns().map((c) => c.id);

    const fromIndex = currentOrder.indexOf(dragColumnId);
    const toIndex = currentOrder.indexOf(overColumnId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const newOrder = [...currentOrder];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, dragColumnId);

    table.setColumnOrder(newOrder);
    onColumnOrderChange?.(newOrder);
  }

  // ─── Row click handler (shift-click range, ctrl-click toggle) ────────
  const lastClickedRowIndex = React.useRef<number>(-1);

  function handleRowClick(rowId: string, e: React.MouseEvent) {
    const rowIndex = allRows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) return;

    const row = allRows[rowIndex];
    if (!row) return;

    if (e.shiftKey && lastClickedRowIndex.current !== -1) {
      // Range selection
      const from = Math.min(lastClickedRowIndex.current, rowIndex);
      const to = Math.max(lastClickedRowIndex.current, rowIndex);
      const newSelection: Record<string, boolean> = {};
      for (let i = from; i <= to; i++) {
        const r = allRows[i];
        if (r) newSelection[r.id] = true;
      }
      table.setRowSelection(newSelection);
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      row.toggleSelected();
      lastClickedRowIndex.current = rowIndex;
    } else {
      // Plain single click — select this row and notify parent for navigation
      table.resetRowSelection();
      row.toggleSelected(true);
      lastClickedRowIndex.current = rowIndex;
      onRowClick?.(rowId);
    }
  }

  // ─── TanStack Virtual ────────────────────────────────────────────────
  // eslint-disable-next-line
  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // ─── Cell context menu ───────────────────────────────────────────────
  function handleCellContextMenu(params: {
    x: number;
    y: number;
    columnId: string;
    rowId: string;
    value: unknown;
  }) {
    setCellMenu(params);
  }

  function closeCellMenu() {
    setCellMenu(null);
  }

  // ─── Skeleton loading state ──────────────────────────────────────────
  if (loading) {
    const visibleCols = [
      { id: '__checkbox__', width: 40 },
      ...columns
        .filter((c) => columnVisibility === undefined || columnVisibility[c.id] !== false)
        .map((c) => ({ id: c.id, width: c.width ?? 160 })),
    ];

    return (
      <div
        className={`${classes.root}${className ? ` ${className}` : ''}`}
        role="status"
        aria-label={t('table.loading.ariaLabel')}
        aria-busy="true"
        style={height !== undefined ? { height } : undefined}
      >
        {/* Sticky skeleton header */}
        <div className={classes.thead} role="rowgroup">
          <div className={classes.headerRow}>
            {visibleCols.map((col) => (
              <div
                key={col.id}
                role="columnheader"
                className={col.id === '__checkbox__' ? classes.checkboxTh : classes.th}
                style={{ width: col.width }}
              >
                {col.id !== '__checkbox__' && (
                  <div className={classes.skeletonPulse} style={{ width: '60%' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton rows */}
        <div className={classes.scrollContainer}>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
            <div
              key={i}
              className={classes.skeletonRow}
              role="row"
              aria-hidden="true"
              style={{ height: rowHeight }}
            >
              {visibleCols.map((col) => (
                <div
                  key={col.id}
                  className={classes.skeletonCell}
                  style={{ width: col.width, height: rowHeight }}
                >
                  {col.id !== '__checkbox__' && (
                    <div
                      className={classes.skeletonPulse}
                      style={{ width: `${55 + ((i * 13 + col.id.length * 7) % 35)}%` }}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className={`${classes.root}${className ? ` ${className}` : ''}`}
        role="alert"
        aria-label={t('table.error.ariaLabel')}
        style={height !== undefined ? { height } : undefined}
      >
        <div className={classes.errorState}>
          <span className={classes.errorStateTitle}>{t('table.error.title')}</span>
          <span className={classes.errorStateMessage}>{error.message}</span>
        </div>
      </div>
    );
  }

  // ─── Empty state check ───────────────────────────────────────────────
  const isEmpty = allRows.length === 0;

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div
      ref={tableContainerRef}
      className={`${classes.root}${className ? ` ${className}` : ''}`}
      style={height !== undefined ? { height } : undefined}
      // tabIndex allows the container to receive focus for context-scoped shortcuts.
      tabIndex={-1}
      data-testid="vastu-table-container"
    >
      {/* Table header (sticky) */}
      <VastuTableHeader
        table={table}
        onColumnReorder={handleColumnReorder}
        onHideColumn={(columnId) => {
          const col = table.getColumn(columnId);
          col?.toggleVisibility(false);
        }}
        onFilterColumn={(columnId) => {
          // Emit to parent — filter UI is managed by FilterBar outside the table
          onFilterToValue?.(null, columnId, 'include');
        }}
      />

      {/* Scrollable body */}
      <div
        ref={scrollContainerRef}
        className={classes.scrollContainer}
        role="rowgroup"
      >
        {isEmpty ? (
          <EmptyState
            icon={<IconTableOff />}
            message={t('table.empty.message')}
            className={classes.emptyState}
          />
        ) : (
          <div
            role="table"
            aria-label={ariaLabel ?? t('table.ariaLabel')}
            style={{ height: totalSize, position: 'relative' }}
          >
            {virtualItems.map((virtualItem) => {
              const row = allRows[virtualItem.index];
              if (!row) return null;
              return (
                <VastuTableRow
                  key={row.id}
                  row={row}
                  top={virtualItem.start}
                  height={virtualItem.size}
                  sourcePageId={sourcePageId}
                  sourcePageName={sourcePageName}
                  onCellContextMenu={handleCellContextMenu}
                  onRowClick={handleRowClick}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with row count */}
      <div className={classes.footer} role="status" aria-live="polite">
        <span className={classes.footerCount}>
          {t('table.footer.rowCount')
            .replace('{visible}', String(allRows.length))
            .replace('{total}', String(data.length))}
        </span>
        {table.getSelectedRowModel().rows.length > 0 && (
          <span>
            {t('table.footer.selectedCount').replace(
              '{count}',
              String(table.getSelectedRowModel().rows.length),
            )}
          </span>
        )}
      </div>

      {/* Cell context menu portal */}
      {cellMenu && typeof document !== 'undefined' &&
        ReactDOM.createPortal(
          <CellContextMenuPortal
            x={cellMenu.x}
            y={cellMenu.y}
            value={cellMenu.value}
            onClose={closeCellMenu}
            onCopyValue={() => {
              onCopyCellValue?.(cellMenu.value, cellMenu.columnId);
              closeCellMenu();
            }}
            onIncludeFilter={() => {
              onFilterToValue?.(cellMenu.value, cellMenu.columnId, 'include');
              closeCellMenu();
            }}
            onExcludeFilter={() => {
              onFilterToValue?.(cellMenu.value, cellMenu.columnId, 'exclude');
              closeCellMenu();
            }}
          />,
          document.body,
        )}
    </div>
  );
}

/**
 * Cell context menu rendered directly into document.body via portal.
 * Positioned at cursor coordinates with viewport-edge flip protection.
 */
interface CellContextMenuPortalProps {
  x: number;
  y: number;
  value: unknown;
  onClose: () => void;
  onCopyValue: () => void;
  onIncludeFilter: () => void;
  onExcludeFilter: () => void;
}

function CellContextMenuPortal({
  x,
  y,
  value,
  onClose,
  onCopyValue,
  onIncludeFilter,
  onExcludeFilter,
}: CellContextMenuPortalProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x, y });

  // Adjust position after first render to keep within viewport
  React.useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let nx = x;
    let ny = y;

    if (rect.right + VIEWPORT_PADDING > vw) {
      nx = vw - rect.width - VIEWPORT_PADDING;
    }
    if (rect.bottom + VIEWPORT_PADDING > vh) {
      ny = vh - rect.height - VIEWPORT_PADDING;
    }
    nx = Math.max(VIEWPORT_PADDING, nx);
    ny = Math.max(VIEWPORT_PADDING, ny);

    if (nx !== x || ny !== y) {
      setPosition({ x: nx, y: ny });
    }
  }, [x, y]);

  // Close on outside click
  React.useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Focus first menu item on open
  React.useEffect(() => {
    requestAnimationFrame(() => {
      const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    });
  }, []);

  const valueStr = value !== null && value !== undefined ? String(value) : '';

  return (
    <>
      {/* Overlay to capture outside clicks */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        aria-hidden="true"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      {/* Menu panel */}
      <div
        ref={menuRef}
        role="menu"
        aria-label={t('contextMenu.ariaLabel')}
        className={contextMenuClasses.menu}
        style={{ left: position.x, top: position.y }}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <ContextMenuCloseContext.Provider value={onClose}>
          <ContextMenuItem
            label={t('contextMenu.cell.copyValue')}
            onSelect={onCopyValue}
          />
          <ContextMenuDivider />
          <ContextMenuItem
            label={t('contextMenu.cell.includeFilter')}
            onSelect={onIncludeFilter}
            disabled={!valueStr}
          />
          <ContextMenuItem
            label={t('contextMenu.cell.excludeFilter')}
            onSelect={onExcludeFilter}
            disabled={!valueStr}
          />
        </ContextMenuCloseContext.Provider>
      </div>
    </>
  );
}

// Wrap with React.memo preserving generic type
export const VastuTable = React.memo(VastuTableInner) as typeof VastuTableInner;

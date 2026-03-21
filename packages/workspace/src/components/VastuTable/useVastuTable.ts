'use client';

/**
 * useVastuTable — hook wiring TanStack Table with Vastu's viewStore.
 *
 * Responsibilities:
 * - Creates the TanStack Table instance with column defs built from VastuColumn[].
 * - Provides controlled sort, column sizing, column order, and visibility state.
 * - Applies client-side filtering via FilterEngine when a filterRoot is provided.
 * - Exposes callbacks that sync state back to the viewStore.
 *
 * Implements US-112 (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-12).
 */

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
  type ColumnOrderState,
  type VisibilityState,
  type RowSelectionState,
  type Row,
  type Table,
} from '@tanstack/react-table';
import { applyFilters } from '../FilterSystem/FilterEngine';
import type { FilterGroup } from '../FilterSystem/types';
import type { VastuColumn, VastuTableProps } from './types';

/** Default row height used by the virtual scroll estimator. */
export const DEFAULT_ROW_HEIGHT = 36;

/** Default number of extra rows to render outside the scroll window. */
export const DEFAULT_OVERSCAN = 5;

/** Default column width in pixels. */
const DEFAULT_COLUMN_WIDTH = 160;

/** Minimum column width in pixels. */
const DEFAULT_MIN_COLUMN_WIDTH = 60;

/**
 * Build a TanStack ColumnDef array from VastuColumn definitions.
 * Includes a leading selection checkbox column.
 *
 * We use an accessor function rather than an accessor key to avoid
 * overly-complex generic constraints with TanStack's column helper.
 */
function buildColumnDefs<TData extends Record<string, unknown>>(
  columns: VastuColumn<TData>[],
): ColumnDef<TData, unknown>[] {
  const selectionCol: ColumnDef<TData, unknown> = {
    id: '__selection__',
    header: ({ table }: { table: Table<TData> }) =>
      React.createElement('input', {
        type: 'checkbox',
        checked: table.getIsAllRowsSelected(),
        onChange: table.getToggleAllRowsSelectedHandler(),
        'aria-label': 'Select all rows',
      }),
    cell: ({ row }: { row: Row<TData> }) =>
      React.createElement('input', {
        type: 'checkbox',
        checked: row.getIsSelected(),
        onChange: row.getToggleSelectedHandler(),
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        'aria-label': `Select row ${row.id}`,
      }),
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableSorting: false,
    enableResizing: false,
  };

  const dataCols: ColumnDef<TData, unknown>[] = columns.map((col) => {
    const accessorKey = (col.accessorKey ?? col.id) as string;
    const colDef: ColumnDef<TData, unknown> = {
      id: col.id,
      accessorFn: (row: TData) => row[accessorKey],
      header: col.label,
      size: col.width ?? DEFAULT_COLUMN_WIDTH,
      minSize: col.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH,
      enableSorting: col.sortable !== false,
      enableResizing: col.resizable !== false,
      enableHiding: col.hideable !== false,
      meta: col,
    };
    if (col.maxWidth !== undefined) {
      colDef.maxSize = col.maxWidth;
    }
    return colDef;
  });

  return [selectionCol, ...dataCols];
}

export type UseVastuTableOptions<TData extends Record<string, unknown>> = Pick<
  VastuTableProps<TData>,
  | 'data'
  | 'columns'
  | 'filterRoot'
  | 'getRowId'
  | 'onSortChange'
  | 'onColumnSizingChange'
  | 'onColumnOrderChange'
  | 'onColumnVisibilityChange'
  | 'onRowSelectionChange'
  | 'sorting'
  | 'columnSizing'
  | 'columnOrder'
  | 'columnVisibility'
>;

export interface UseVastuTableResult<TData extends Record<string, unknown>> {
  table: Table<TData>;
  filteredData: TData[];
  sortingState: SortingState;
  columnSizingState: ColumnSizingState;
  columnOrderState: ColumnOrderState;
  columnVisibilityState: VisibilityState;
  rowSelectionState: RowSelectionState;
  setSortingState: React.Dispatch<React.SetStateAction<SortingState>>;
  setColumnSizingState: React.Dispatch<React.SetStateAction<ColumnSizingState>>;
  setColumnOrderState: React.Dispatch<React.SetStateAction<ColumnOrderState>>;
  setColumnVisibilityState: React.Dispatch<React.SetStateAction<VisibilityState>>;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  allRows: Row<TData>[];
}

export function useVastuTable<TData extends Record<string, unknown>>({
  data,
  columns,
  filterRoot,
  getRowId,
  onSortChange,
  onColumnSizingChange,
  onColumnOrderChange,
  onColumnVisibilityChange,
  onRowSelectionChange,
  sorting: controlledSorting,
  columnSizing: controlledColumnSizing,
  columnOrder: controlledColumnOrder,
  columnVisibility: controlledColumnVisibility,
}: UseVastuTableOptions<TData>): UseVastuTableResult<TData> {
  // ─── Internal state (used when not controlled externally) ───────────
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalSizing, setInternalSizing] = React.useState<ColumnSizingState>({});
  const [internalOrder, setInternalOrder] = React.useState<ColumnOrderState>([]);
  const [internalVisibility, setInternalVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Use controlled state when provided, otherwise fall back to internal state
  const sortingState = controlledSorting ?? internalSorting;
  const columnSizingState = controlledColumnSizing ?? internalSizing;
  const columnOrderState = controlledColumnOrder ?? internalOrder;
  const columnVisibilityState = controlledColumnVisibility ?? internalVisibility;

  // ─── Apply client-side filtering ────────────────────────────────────
  const filteredData = React.useMemo<TData[]>(() => {
    if (!filterRoot) return data;
    return applyFilters(data, filterRoot as FilterGroup);
  }, [data, filterRoot]);

  // ─── Build column defs (memoized) ───────────────────────────────────
  const columnDefs = React.useMemo(
    () => buildColumnDefs(columns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns],
  );

  // ─── Sorting change handler ──────────────────────────────────────────
  const handleSortingChange = React.useCallback(
    (updater: React.SetStateAction<SortingState>) => {
      const newState = typeof updater === 'function' ? updater(sortingState) : updater;
      setInternalSorting(newState);
      onSortChange?.(newState);
    },
    [sortingState, onSortChange],
  );

  // ─── Column sizing change handler ────────────────────────────────────
  const handleColumnSizingChange = React.useCallback(
    (updater: React.SetStateAction<ColumnSizingState>) => {
      const newState = typeof updater === 'function' ? updater(columnSizingState) : updater;
      setInternalSizing(newState);
      onColumnSizingChange?.(newState);
    },
    [columnSizingState, onColumnSizingChange],
  );

  // ─── Column order change handler ─────────────────────────────────────
  const handleColumnOrderChange = React.useCallback(
    (updater: React.SetStateAction<ColumnOrderState>) => {
      const newState = typeof updater === 'function' ? updater(columnOrderState) : updater;
      setInternalOrder(newState);
      onColumnOrderChange?.(newState);
    },
    [columnOrderState, onColumnOrderChange],
  );

  // ─── Column visibility change handler ────────────────────────────────
  const handleColumnVisibilityChange = React.useCallback(
    (updater: React.SetStateAction<VisibilityState>) => {
      const newState = typeof updater === 'function' ? updater(columnVisibilityState) : updater;
      setInternalVisibility(newState);
      onColumnVisibilityChange?.(newState);
    },
    [columnVisibilityState, onColumnVisibilityChange],
  );

  // ─── Row selection change handler ────────────────────────────────────
  const handleRowSelectionChange = React.useCallback(
    (updater: React.SetStateAction<RowSelectionState>) => {
      const newState = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newState);
      if (onRowSelectionChange) {
        onRowSelectionChange(new Set(Object.keys(newState).filter((k) => newState[k])));
      }
    },
    [rowSelection, onRowSelectionChange],
  );

  // ─── Create TanStack Table instance ──────────────────────────────────
  const table = useReactTable<TData>({
    data: filteredData,
    columns: columnDefs,
    state: {
      sorting: sortingState,
      columnSizing: columnSizingState,
      columnOrder: columnOrderState,
      columnVisibility: columnVisibilityState,
      rowSelection,
    },
    ...(getRowId ? { getRowId: (row) => getRowId(row) } : {}),
    enableRowSelection: true,
    enableMultiRowSelection: true,
    enableMultiSort: true,
    onSortingChange: handleSortingChange,
    onColumnSizingChange: handleColumnSizingChange,
    onColumnOrderChange: handleColumnOrderChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: handleRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });

  const allRows = table.getRowModel().rows;

  return {
    table,
    filteredData,
    sortingState,
    columnSizingState,
    columnOrderState,
    columnVisibilityState,
    rowSelectionState: rowSelection,
    setSortingState: setInternalSorting,
    setColumnSizingState: setInternalSizing,
    setColumnOrderState: setInternalOrder,
    setColumnVisibilityState: setInternalVisibility,
    setRowSelectionState: setRowSelection,
    allRows,
  };
}

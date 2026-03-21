/**
 * useVastuTable hook tests.
 *
 * Tests the core table hook logic:
 * - Column defs built from VastuColumn[]
 * - Client-side filtering via FilterEngine
 * - Sort, size, order, visibility state management
 * - Row selection
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVastuTable } from '../useVastuTable';
import type { VastuColumn } from '../types';

// ─── Test data ───────────────────────────────────────────────────────────────

interface TestRow extends Record<string, unknown> {
  id: string;
  name: string;
  value: number;
}

const DATA: TestRow[] = [
  { id: '1', name: 'Alpha', value: 10 },
  { id: '2', name: 'Beta', value: 20 },
  { id: '3', name: 'Gamma', value: 30 },
];

const COLUMNS: VastuColumn<TestRow>[] = [
  { id: 'name', label: 'Name', dataType: 'text', accessorKey: 'name' },
  { id: 'value', label: 'Value', dataType: 'number', accessorKey: 'value' },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useVastuTable', () => {
  it('returns all rows when no filter is applied', () => {
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS }),
    );
    expect(result.current.filteredData).toHaveLength(3);
    expect(result.current.allRows).toHaveLength(3);
  });

  it('filters rows when filterRoot is provided', () => {
    const filterRoot = {
      type: 'group' as const,
      connector: 'AND' as const,
      children: [
        {
          type: 'condition' as const,
          column: 'name',
          mode: 'include' as const,
          value: 'Alpha',
          dataType: 'text' as const,
        },
      ],
    };

    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, filterRoot }),
    );

    expect(result.current.filteredData).toHaveLength(1);
    expect(result.current.filteredData[0].name).toBe('Alpha');
  });

  it('returns all rows when filterRoot is null', () => {
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, filterRoot: null }),
    );
    expect(result.current.filteredData).toHaveLength(3);
  });

  it('returns empty array when all rows are filtered out', () => {
    const filterRoot = {
      type: 'group' as const,
      connector: 'AND' as const,
      children: [
        {
          type: 'condition' as const,
          column: 'name',
          mode: 'include' as const,
          value: 'NonExistent',
          dataType: 'text' as const,
        },
      ],
    };

    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, filterRoot }),
    );

    expect(result.current.filteredData).toHaveLength(0);
  });

  it('initialises with empty sort state', () => {
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS }),
    );
    expect(result.current.sortingState).toEqual([]);
  });

  it('uses controlled sorting state when provided', () => {
    const controlled = [{ id: 'name', desc: false }];
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, sorting: controlled }),
    );
    expect(result.current.sortingState).toEqual(controlled);
  });

  it('calls onSortChange when the table triggers a sort change', () => {
    const onSortChange = vi.fn();
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, onSortChange }),
    );

    // Trigger sort change via the table's setSorting (which goes through handleSortingChange)
    act(() => {
      result.current.table.setSorting([{ id: 'name', desc: false }]);
    });

    expect(onSortChange).toHaveBeenCalledWith([{ id: 'name', desc: false }]);
  });

  it('initialises with empty column visibility state', () => {
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS }),
    );
    expect(result.current.columnVisibilityState).toEqual({});
  });

  it('uses controlled column visibility when provided', () => {
    const visibility = { name: false };
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, columnVisibility: visibility }),
    );
    expect(result.current.columnVisibilityState).toEqual(visibility);
  });

  it('calls onColumnVisibilityChange when visibility changes via table', () => {
    const onColumnVisibilityChange = vi.fn();
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, onColumnVisibilityChange }),
    );

    act(() => {
      result.current.table.setColumnVisibility({ name: false });
    });

    expect(onColumnVisibilityChange).toHaveBeenCalledWith({ name: false });
  });

  it('initialises with empty row selection state', () => {
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS }),
    );
    expect(result.current.rowSelectionState).toEqual({});
  });

  it('calls onRowSelectionChange with Set of selected IDs', () => {
    const onRowSelectionChange = vi.fn();
    const { result } = renderHook(() =>
      useVastuTable({
        data: DATA,
        columns: COLUMNS,
        getRowId: (row) => row.id,
        onRowSelectionChange,
      }),
    );

    act(() => {
      result.current.table.setRowSelection({ '1': true, '2': true });
    });

    expect(onRowSelectionChange).toHaveBeenCalledOnce();
    const [ids] = onRowSelectionChange.mock.calls[0] as [Set<string>];
    expect(ids).toBeInstanceOf(Set);
    expect(ids.has('1')).toBe(true);
    expect(ids.has('2')).toBe(true);
    expect(ids.size).toBe(2);
  });

  it('uses getRowId to set stable row IDs', () => {
    const { result } = renderHook(() =>
      useVastuTable({
        data: DATA,
        columns: COLUMNS,
        getRowId: (row) => row.id,
      }),
    );

    const rows = result.current.allRows;
    expect(rows[0].id).toBe('1');
    expect(rows[1].id).toBe('2');
    expect(rows[2].id).toBe('3');
  });

  it('includes the __selection__ column in the table defs', () => {
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS }),
    );

    const allColumns = result.current.table.getAllLeafColumns();
    const selectionCol = allColumns.find((c) => c.id === '__selection__');
    expect(selectionCol).toBeTruthy();
  });

  it('applies OR filter correctly', () => {
    const filterRoot = {
      type: 'group' as const,
      connector: 'OR' as const,
      children: [
        {
          type: 'condition' as const,
          column: 'name',
          mode: 'include' as const,
          value: 'Alpha',
          dataType: 'text' as const,
        },
        {
          type: 'condition' as const,
          column: 'name',
          mode: 'include' as const,
          value: 'Beta',
          dataType: 'text' as const,
        },
      ],
    };

    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, filterRoot }),
    );

    expect(result.current.filteredData).toHaveLength(2);
  });

  it('applies exclude filter correctly', () => {
    const filterRoot = {
      type: 'group' as const,
      connector: 'AND' as const,
      children: [
        {
          type: 'condition' as const,
          column: 'name',
          mode: 'exclude' as const,
          value: 'Beta',
          dataType: 'text' as const,
        },
      ],
    };

    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, filterRoot }),
    );

    // Beta should be excluded — 2 rows remain
    expect(result.current.filteredData).toHaveLength(2);
    expect(result.current.filteredData.some((r) => r.name === 'Beta')).toBe(false);
  });

  it('initialises column order state as empty array', () => {
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS }),
    );
    expect(result.current.columnOrderState).toEqual([]);
  });

  it('uses controlled column order when provided', () => {
    const order = ['__selection__', 'value', 'name'];
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS, columnOrder: order }),
    );
    expect(result.current.columnOrderState).toEqual(order);
  });

  it('initialises column sizing state as empty object', () => {
    const { result } = renderHook(() =>
      useVastuTable({ data: DATA, columns: COLUMNS }),
    );
    expect(result.current.columnSizingState).toEqual({});
  });
});

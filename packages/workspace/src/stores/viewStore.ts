'use client';

/**
 * viewStore — manages the current view state (filters, sort, columns, pagination).
 *
 * The view store is consumed by ViewToolbar (US-111), VastuTable (US-112),
 * and FilterSystem (US-114). It is a headless store with no UI.
 *
 * isModified compares currentState vs savedState, ignoring scrollPosition.
 *
 * Implements US-110 (AC-1 through AC-9).
 */

import { create } from 'zustand';
import type {
  ViewState,
  FilterNode,
  SortState,
  ColumnState,
} from '@vastu/shared/types';

/**
 * Runtime normalization: maps persisted views that used the old schema
 * (operator: 'and'|'or', field: string) to the current schema
 * (connector: 'AND'|'OR', column: string).
 *
 * This is Option B from the plan — belt-and-suspenders resilience so that
 * existing saved views do not crash when loaded. A DB migration (Option A)
 * can be applied separately for data hygiene.
 */

/**
 * Raw shape of a potentially-old-schema filter node from persisted JSON.
 * We use a plain record to safely access keys that may or may not exist
 * without TypeScript complaining about properties not on the current type.
 */
type RawFilterNode = Record<string, unknown>;

function normalizeFilterNode(node: FilterNode | null): FilterNode | null {
  if (!node) return null;

  // Cast to raw record for safe old-schema key inspection
  const raw = node as unknown as RawFilterNode;

  if (raw['type'] === 'condition') {
    // Old schema used `field` instead of `column`. Normalize on read.
    if (typeof raw['column'] !== 'string' && typeof raw['field'] === 'string') {
      // Destructure `field` out so it does not appear on the normalized node.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { field: _field, ...rest } = raw;
      return { ...rest, column: raw['field'] as string } as unknown as FilterNode;
    }
    return node;
  }

  if (raw['type'] === 'group') {
    // Old schema used `operator: 'and'|'or'` instead of `connector: 'AND'|'OR'`.
    let connector: 'AND' | 'OR';
    if (typeof raw['connector'] === 'string') {
      connector = (raw['connector'] as string).toUpperCase() === 'OR' ? 'OR' : 'AND';
    } else if (raw['operator'] === 'or') {
      connector = 'OR';
    } else {
      connector = 'AND';
    }

    const children = Array.isArray(raw['children']) ? raw['children'] : [];

    return {
      type: 'group',
      connector,
      children: children
        .map((child) => normalizeFilterNode(child as FilterNode))
        .filter((child): child is FilterNode => child !== null),
    };
  }

  return node;
}

/** Default empty view state. */
const DEFAULT_VIEW_STATE: ViewState = {
  filters: null,
  sort: [],
  columns: [],
  pagination: { page: 1, pageSize: 25 },
  scrollPosition: { x: 0, y: 0 },
};

interface ViewStoreState {
  /** ID of the currently loaded view (null if unsaved). */
  currentViewId: string | null;
  /** The last saved snapshot — used for isModified comparison. */
  savedState: ViewState | null;
  /** The live working state. */
  currentState: ViewState;

  // ---- Computed ----

  /** True when currentState differs from savedState (ignoring scrollPosition). */
  isModified: () => boolean;

  // ---- Actions ----

  /** Save the current state as a named view via API. */
  saveView: (name: string, pageId: string) => Promise<void>;
  /** Load a view from the API by ID. */
  loadView: (id: string) => Promise<void>;
  /** Reset current state to the last saved state. */
  resetView: () => void;
  /** Update filter state. */
  updateFilters: (filters: FilterNode | null) => void;
  /** Update sort state. */
  updateSort: (sort: SortState[]) => void;
  /** Update column state. */
  updateColumns: (columns: ColumnState[]) => void;
  /** Update pagination. */
  updatePagination: (page: number, pageSize: number) => void;
  /** Update scroll position. */
  updateScrollPosition: (x: number, y: number) => void;
  /** Set full view state (used when loading). */
  setViewState: (state: ViewState, viewId?: string) => void;
}

/**
 * Compare two ViewState objects for equality, ignoring scrollPosition.
 * Used to compute isModified.
 */
function viewStatesEqual(a: ViewState, b: ViewState): boolean {
  return (
    JSON.stringify({
      filters: a.filters,
      sort: a.sort,
      columns: a.columns,
      pagination: a.pagination,
    }) ===
    JSON.stringify({
      filters: b.filters,
      sort: b.sort,
      columns: b.columns,
      pagination: b.pagination,
    })
  );
}

export const useViewStore = create<ViewStoreState>()((set, get) => ({
  currentViewId: null,
  savedState: null,
  currentState: { ...DEFAULT_VIEW_STATE },

  isModified: () => {
    const { savedState, currentState } = get();
    if (!savedState) return false;
    return !viewStatesEqual(currentState, savedState);
  },

  saveView: async (name: string, pageId: string) => {
    const { currentState, currentViewId } = get();
    const body = {
      name,
      pageId,
      stateJson: currentState,
    };

    let viewId = currentViewId;

    if (currentViewId) {
      // Update existing view
      const res = await fetch(`/api/workspace/views/${currentViewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save view');
    } else {
      // Create new view
      const res = await fetch('/api/workspace/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create view');
      const data = (await res.json()) as { id: string };
      viewId = data.id;
    }

    set({
      currentViewId: viewId,
      savedState: { ...currentState },
    });
  },

  loadView: async (id: string) => {
    const res = await fetch(`/api/workspace/views/${id}`);
    if (!res.ok) throw new Error('Failed to load view');
    const data = (await res.json()) as { stateJson: ViewState };

    const viewState: ViewState = {
      ...DEFAULT_VIEW_STATE,
      ...data.stateJson,
      // Normalize filters from any persisted old-schema views (operator→connector, field→column).
      filters: normalizeFilterNode(data.stateJson?.filters ?? null),
    };

    set({
      currentViewId: id,
      savedState: { ...viewState },
      currentState: { ...viewState },
    });
  },

  resetView: () => {
    const { savedState } = get();
    if (savedState) {
      set({ currentState: { ...savedState } });
    }
  },

  updateFilters: (filters) =>
    set((state) => ({
      currentState: { ...state.currentState, filters },
    })),

  updateSort: (sort) =>
    set((state) => ({
      currentState: { ...state.currentState, sort },
    })),

  updateColumns: (columns) =>
    set((state) => ({
      currentState: { ...state.currentState, columns },
    })),

  updatePagination: (page, pageSize) =>
    set((state) => ({
      currentState: {
        ...state.currentState,
        pagination: { page, pageSize },
      },
    })),

  updateScrollPosition: (x, y) =>
    set((state) => ({
      currentState: {
        ...state.currentState,
        scrollPosition: { x, y },
      },
    })),

  setViewState: (viewState, viewId) =>
    set({
      currentViewId: viewId ?? null,
      savedState: viewId ? { ...viewState } : null,
      currentState: { ...viewState },
    }),
}));

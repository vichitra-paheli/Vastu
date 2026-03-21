/**
 * viewFilterStore — per-view filter state management.
 *
 * Stores filter state keyed by view ID, allowing each panel/view
 * to maintain independent filter state.
 *
 * Implements US-114 (AC-9, AC-10, AC-11).
 */

import { create } from 'zustand';
import type { FilterState, FilterGroup } from '../components/FilterSystem/types';
import { countConditions } from '../components/FilterSystem/types';

interface ViewFilterState {
  /** Filter state keyed by view ID. */
  filtersByView: Record<string, FilterState>;

  /** Get the current filter state for a view. */
  getFilters: (viewId: string) => FilterState;

  /** Update the filter state for a view. */
  setFilters: (viewId: string, state: FilterState) => void;

  /** Clear all filters for a view. */
  clearFilters: (viewId: string) => void;

  /** Clear all views' filter state. */
  clearAll: () => void;
}

const DEFAULT_FILTER_STATE: FilterState = {
  root: null,
  advanced: false,
};

export const useViewFilterStore = create<ViewFilterState>()((set, get) => ({
  filtersByView: {},

  getFilters: (viewId) => {
    return get().filtersByView[viewId] ?? DEFAULT_FILTER_STATE;
  },

  setFilters: (viewId, state) => {
    set((prev) => ({
      filtersByView: {
        ...prev.filtersByView,
        [viewId]: state,
      },
    }));
  },

  clearFilters: (viewId) => {
    set((prev) => ({
      filtersByView: {
        ...prev.filtersByView,
        [viewId]: DEFAULT_FILTER_STATE,
      },
    }));
  },

  clearAll: () => {
    set({ filtersByView: {} });
  },
}));

/**
 * Convenience hook for a specific view's filter state.
 * Returns the state and a setter for that view.
 */
export function useViewFilters(viewId: string): {
  filterState: FilterState;
  setFilterState: (state: FilterState) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  root: FilterGroup | null;
} {
  const filtersByView = useViewFilterStore((s) => s.filtersByView);
  const setFilters = useViewFilterStore((s) => s.setFilters);
  const clearFilters = useViewFilterStore((s) => s.clearFilters);

  const filterState = filtersByView[viewId] ?? DEFAULT_FILTER_STATE;

  function setFilterState(state: FilterState) {
    setFilters(viewId, state);
  }

  function clear() {
    clearFilters(viewId);
  }

  // Count active conditions for the "Filters active (N)" indicator
  const activeFilterCount = countConditions(filterState.root);

  return {
    filterState,
    setFilterState,
    clearFilters: clear,
    activeFilterCount,
    root: filterState.root,
  };
}

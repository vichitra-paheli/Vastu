/**
 * viewFilterStore — per-view filter state management.
 *
 * Stores filter state keyed by view ID, allowing each panel/view
 * to maintain independent filter state.
 *
 * Also stores the active IER (Include/Exclude/Regex) mode per view,
 * used by ModeSwitch and filter inputs to default new conditions to
 * the currently selected mode.
 *
 * Implements US-114 (AC-9, AC-10, AC-11) and US-108 (AC-6, AC-7).
 */

import { create } from 'zustand';
import type { FilterMode, FilterState, FilterGroup } from '../components/FilterSystem/types';
import { countConditions } from '../components/FilterSystem/types';

/** Default IER filter mode — new filters start in Include mode. */
const DEFAULT_MODE: FilterMode = 'include';

interface ViewFilterState {
  /** Filter state keyed by view ID. */
  filtersByView: Record<string, FilterState>;

  /**
   * Active IER mode keyed by view ID.
   * Determines the default mode for new filter conditions (AC-6).
   * Serializable as part of panel state (AC-7).
   */
  modeByView: Record<string, FilterMode>;

  /** Get the current filter state for a view. */
  getFilters: (viewId: string) => FilterState;

  /** Update the filter state for a view. */
  setFilters: (viewId: string, state: FilterState) => void;

  /** Clear all filters for a view. */
  clearFilters: (viewId: string) => void;

  /** Get the active IER mode for a view. */
  getMode: (viewId: string) => FilterMode;

  /** Set the active IER mode for a view. */
  setMode: (viewId: string, mode: FilterMode) => void;

  /** Clear all views' filter state. */
  clearAll: () => void;
}

const DEFAULT_FILTER_STATE: FilterState = {
  root: null,
  advanced: false,
};

export const useViewFilterStore = create<ViewFilterState>()((set, get) => ({
  filtersByView: {},
  modeByView: {},

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

  getMode: (viewId) => {
    return get().modeByView[viewId] ?? DEFAULT_MODE;
  },

  setMode: (viewId, mode) => {
    set((prev) => ({
      modeByView: {
        ...prev.modeByView,
        [viewId]: mode,
      },
    }));
  },

  clearAll: () => {
    set({ filtersByView: {}, modeByView: {} });
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
  const filterState = useViewFilterStore(
    (s) => s.filtersByView[viewId] ?? DEFAULT_FILTER_STATE,
  );
  const setFilters = useViewFilterStore((s) => s.setFilters);
  const clearFilters = useViewFilterStore((s) => s.clearFilters);

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

/**
 * Convenience hook for a specific view's IER mode.
 * Used by ModeSwitch and filter inputs.
 *
 * Returns the active mode and a setter.
 * Default is 'include' when no mode has been set for the view.
 *
 * The mode is per-view (AC-6) and is part of serializable panel state (AC-7).
 */
export function useViewMode(viewId: string): {
  mode: FilterMode;
  setMode: (mode: FilterMode) => void;
} {
  const mode = useViewFilterStore((s) => s.modeByView[viewId] ?? DEFAULT_MODE);
  const storeSetter = useViewFilterStore((s) => s.setMode);

  function setMode(m: FilterMode) {
    storeSetter(viewId, m);
  }

  return { mode, setMode };
}

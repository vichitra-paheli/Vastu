import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useViewStore } from '../viewStore';
import type { ViewState } from '@vastu/shared/types';

const mockViewState: ViewState = {
  filters: { type: 'condition', field: 'name', mode: 'include', dataType: 'text', value: 'test' },
  sort: [{ field: 'name', direction: 'asc' }],
  columns: [{ id: 'name', visible: true, order: 0 }],
  pagination: { page: 1, pageSize: 25 },
  scrollPosition: { x: 0, y: 0 },
};

describe('viewStore', () => {
  beforeEach(() => {
    useViewStore.setState({
      currentViewId: null,
      savedState: null,
      currentState: {
        filters: null,
        sort: [],
        columns: [],
        pagination: { page: 1, pageSize: 25 },
        scrollPosition: { x: 0, y: 0 },
      },
    });
    vi.restoreAllMocks();
  });

  describe('isModified', () => {
    it('returns false when savedState is null', () => {
      expect(useViewStore.getState().isModified()).toBe(false);
    });

    it('returns false when currentState equals savedState', () => {
      useViewStore.setState({
        savedState: { ...mockViewState },
        currentState: { ...mockViewState },
      });
      expect(useViewStore.getState().isModified()).toBe(false);
    });

    it('returns true when filters differ', () => {
      useViewStore.setState({
        savedState: { ...mockViewState },
        currentState: { ...mockViewState, filters: null },
      });
      expect(useViewStore.getState().isModified()).toBe(true);
    });

    it('returns true when sort differs', () => {
      useViewStore.setState({
        savedState: { ...mockViewState },
        currentState: { ...mockViewState, sort: [{ field: 'name', direction: 'desc' }] },
      });
      expect(useViewStore.getState().isModified()).toBe(true);
    });

    it('ignores scrollPosition changes', () => {
      useViewStore.setState({
        savedState: { ...mockViewState },
        currentState: { ...mockViewState, scrollPosition: { x: 100, y: 200 } },
      });
      expect(useViewStore.getState().isModified()).toBe(false);
    });
  });

  describe('updateFilters', () => {
    it('updates the filter state', () => {
      const filter = { type: 'condition' as const, field: 'status', mode: 'include' as const, dataType: 'enum' as const, value: 'active' };
      useViewStore.getState().updateFilters(filter);
      expect(useViewStore.getState().currentState.filters).toEqual(filter);
    });
  });

  describe('updateSort', () => {
    it('updates the sort state', () => {
      const sort = [{ field: 'date', direction: 'desc' as const }];
      useViewStore.getState().updateSort(sort);
      expect(useViewStore.getState().currentState.sort).toEqual(sort);
    });
  });

  describe('updateColumns', () => {
    it('updates the column state', () => {
      const columns = [{ id: 'name', visible: true, order: 0 }, { id: 'email', visible: false, order: 1 }];
      useViewStore.getState().updateColumns(columns);
      expect(useViewStore.getState().currentState.columns).toEqual(columns);
    });
  });

  describe('updatePagination', () => {
    it('updates page and pageSize', () => {
      useViewStore.getState().updatePagination(3, 50);
      expect(useViewStore.getState().currentState.pagination).toEqual({ page: 3, pageSize: 50 });
    });
  });

  describe('resetView', () => {
    it('resets currentState to savedState', () => {
      useViewStore.setState({
        savedState: { ...mockViewState },
        currentState: { ...mockViewState, filters: null, sort: [] },
      });
      useViewStore.getState().resetView();
      expect(useViewStore.getState().currentState.filters).toEqual(mockViewState.filters);
      expect(useViewStore.getState().currentState.sort).toEqual(mockViewState.sort);
    });

    it('does nothing when savedState is null', () => {
      const before = { ...useViewStore.getState().currentState };
      useViewStore.getState().resetView();
      expect(useViewStore.getState().currentState).toEqual(before);
    });
  });

  describe('setViewState', () => {
    it('sets currentState and savedState with viewId', () => {
      useViewStore.getState().setViewState(mockViewState, 'view-1');
      expect(useViewStore.getState().currentViewId).toBe('view-1');
      expect(useViewStore.getState().savedState).toEqual(mockViewState);
      expect(useViewStore.getState().currentState).toEqual(mockViewState);
    });

    it('sets currentState without savedState when no viewId', () => {
      useViewStore.getState().setViewState(mockViewState);
      expect(useViewStore.getState().currentViewId).toBeNull();
      expect(useViewStore.getState().savedState).toBeNull();
      expect(useViewStore.getState().currentState).toEqual(mockViewState);
    });
  });

  describe('saveView', () => {
    it('creates a new view when no currentViewId', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'new-view-id' }),
      });
      global.fetch = mockFetch;

      useViewStore.setState({ currentState: mockViewState, currentViewId: null });
      await useViewStore.getState().saveView('My View', 'page-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/workspace/views', expect.objectContaining({ method: 'POST' }));
      expect(useViewStore.getState().currentViewId).toBe('new-view-id');
      expect(useViewStore.getState().savedState).toEqual(mockViewState);
    });

    it('updates existing view when currentViewId is set', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      useViewStore.setState({ currentState: mockViewState, currentViewId: 'existing-id' });
      await useViewStore.getState().saveView('Updated', 'page-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/workspace/views/existing-id', expect.objectContaining({ method: 'PATCH' }));
      expect(useViewStore.getState().currentViewId).toBe('existing-id');
    });

    it('throws on failed save', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      useViewStore.setState({ currentViewId: 'id' });

      await expect(useViewStore.getState().saveView('Test', 'page-1')).rejects.toThrow('Failed to save view');
    });
  });

  describe('loadView', () => {
    it('loads view state from API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ stateJson: mockViewState }),
      });

      await useViewStore.getState().loadView('view-1');

      expect(useViewStore.getState().currentViewId).toBe('view-1');
      expect(useViewStore.getState().currentState.filters).toEqual(mockViewState.filters);
    });

    it('throws on failed load', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      await expect(useViewStore.getState().loadView('bad-id')).rejects.toThrow('Failed to load view');
    });
  });
});

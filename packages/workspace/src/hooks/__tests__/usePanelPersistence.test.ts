/**
 * Unit tests for usePanelPersistence hook.
 *
 * Tests cover:
 * - Pre-loads persisted layout from localStorage into the store on mount
 * - Subscribes to onDidLayoutChange and saves layout with debounce
 * - Handles corrupted localStorage gracefully
 * - Cleans up subscription on unmount
 *
 * Implements AC-8: Panel state persisted to localStorage, restored on page load.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePanelPersistence, PANEL_LAYOUT_STORAGE_KEY } from '../usePanelPersistence';
import { usePanelStore } from '../../stores/panelStore';
import { createMockDockviewApi } from '../../test-utils/mock-dockview';
import type { SerializedLayout } from '../../types/panel';
import { Orientation } from 'dockview-core';

// Use fake timers to test debouncing without waiting for real delays
vi.useFakeTimers();

describe('usePanelPersistence', () => {
  beforeEach(() => {
    usePanelStore.setState({
      api: null,
      activePanelId: null,
      openPanelIds: [],
      layout: null,
    });
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runAllTimers();
  });

  it('loads persisted layout from localStorage on mount', () => {
    const mockLayout: SerializedLayout = {
      grid: {
        root: { type: 'leaf', data: [] },
        height: 600,
        width: 800,
        orientation: Orientation.HORIZONTAL,
      },
      panels: {},
      floatingGroups: [],
      popoutGroups: [],
      activeGroup: undefined,
    };
    localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(mockLayout));

    renderHook(() => usePanelPersistence());

    expect(usePanelStore.getState().layout).toEqual(mockLayout);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, '{not valid json');

    // Should not throw
    expect(() => renderHook(() => usePanelPersistence())).not.toThrow();
    // Layout should remain null (corrupted entry cleared)
    expect(usePanelStore.getState().layout).toBeNull();
    // Corrupted entry should be removed from storage
    expect(localStorage.removeItem).toHaveBeenCalledWith(PANEL_LAYOUT_STORAGE_KEY);
  });

  it('subscribes to onDidLayoutChange when api is available', () => {
    const api = createMockDockviewApi();
    usePanelStore.setState({ api });

    renderHook(() => usePanelPersistence());

    expect(api.onDidLayoutChange).toHaveBeenCalled();
  });

  it('saves layout to localStorage after debounce delay', () => {
    const api = createMockDockviewApi();
    usePanelStore.setState({ api });

    // Capture the layout change callback
    let layoutChangeCallback: (() => void) | undefined;
    vi.mocked(api.onDidLayoutChange).mockImplementation((cb: () => void) => {
      layoutChangeCallback = cb;
      return { dispose: vi.fn() };
    });

    renderHook(() => usePanelPersistence());

    // Simulate a layout change
    act(() => {
      layoutChangeCallback?.();
    });

    // Before debounce delay — should not have saved yet
    expect(localStorage.setItem).not.toHaveBeenCalledWith(
      PANEL_LAYOUT_STORAGE_KEY,
      expect.any(String),
    );

    // After debounce delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      PANEL_LAYOUT_STORAGE_KEY,
      expect.any(String),
    );
  });

  it('debounces rapid layout changes — only saves once', () => {
    const api = createMockDockviewApi();
    usePanelStore.setState({ api });

    let layoutChangeCallback: (() => void) | undefined;
    vi.mocked(api.onDidLayoutChange).mockImplementation((cb: () => void) => {
      layoutChangeCallback = cb;
      return { dispose: vi.fn() };
    });

    renderHook(() => usePanelPersistence());

    // Fire many rapid layout changes
    act(() => {
      for (let i = 0; i < 10; i++) {
        layoutChangeCallback?.();
      }
    });

    // Advance to just under the debounce threshold
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(localStorage.setItem).not.toHaveBeenCalledWith(
      PANEL_LAYOUT_STORAGE_KEY,
      expect.any(String),
    );

    // Advance past the threshold
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Should only have saved once despite 10 change events
    const callCount = vi.mocked(localStorage.setItem).mock.calls.filter(
      (args) => args[0] === PANEL_LAYOUT_STORAGE_KEY,
    ).length;
    expect(callCount).toBe(1);
  });

  it('disposes subscription on unmount', () => {
    const api = createMockDockviewApi();
    const disposeSpy = vi.fn();
    vi.mocked(api.onDidLayoutChange).mockReturnValue({ dispose: disposeSpy });
    usePanelStore.setState({ api });

    const { unmount } = renderHook(() => usePanelPersistence());
    unmount();

    expect(disposeSpy).toHaveBeenCalled();
  });
});

/**
 * Tests for useNavigateToPage hook.
 *
 * Verifies that:
 * - navigateToPage stores intent in navigationStore before opening panel
 * - forceNewPanel=true generates unique panel ID
 * - isPageRegistered checks both registries
 * - Warns and no-ops for unregistered page IDs
 *
 * Implements US-209e (VASTU-2A-209).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigateToPage } from '../useNavigateToPage';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePanelStore } from '../../stores/panelStore';

// Mock the panel registry
const mockGetPanel = vi.fn();
vi.mock('../../panels/registry', () => ({
  getPanel: (...args: unknown[]) => mockGetPanel(...args),
}));

// Mock the page registry
const mockGetPageById = vi.fn();
vi.mock('../../pages/registry', () => ({
  getPageById: (...args: unknown[]) => mockGetPageById(...args),
}));

// Mock usePanelStore to control openPanel / focusPanel
const mockOpenPanel = vi.fn();
const mockFocusPanel = vi.fn();

vi.mock('../../stores/panelStore', () => ({
  usePanelStore: vi.fn(),
}));

const mockUsePanelStore = vi.mocked(usePanelStore);

function setupPanelStore(openPanelIds: string[] = []) {
  mockUsePanelStore.mockImplementation((selector: (s: unknown) => unknown) => {
    const state = {
      openPanel: mockOpenPanel,
      focusPanel: mockFocusPanel,
      openPanelIds,
    };
    return selector(state);
  });
}

describe('useNavigateToPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNavigationStore.getState().clearAllIntents();
    setupPanelStore([]);
  });

  afterEach(() => {
    useNavigationStore.getState().clearAllIntents();
  });

  describe('navigateToPage', () => {
    it('warns and no-ops when panel is not registered', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      mockGetPanel.mockReturnValue(undefined);

      const { result } = renderHook(() => useNavigateToPage());

      act(() => {
        result.current.navigateToPage({ targetPageId: 'nonexistent-page' });
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('No panel registered for page "nonexistent-page"'),
      );
      expect(mockOpenPanel).not.toHaveBeenCalled();
      expect(mockFocusPanel).not.toHaveBeenCalled();

      consoleWarn.mockRestore();
    });

    it('stores intent in navigationStore before opening panel', () => {
      const mockDefinition = { id: 'f1-races', title: 'Races', component: vi.fn() };
      mockGetPanel.mockReturnValue(mockDefinition);

      const { result } = renderHook(() => useNavigateToPage());

      act(() => {
        result.current.navigateToPage({
          targetPageId: 'f1-races',
          recordId: 'race-5',
          sourcePageId: 'dashboard',
          sourcePageName: 'Dashboard',
        });
      });

      // Intent should be stored in the navigation store
      const intents = useNavigationStore.getState().intents;
      expect(intents['f1-races']).toEqual({
        targetPageId: 'f1-races',
        recordId: 'race-5',
        sourcePageId: 'dashboard',
        sourcePageName: 'Dashboard',
      });
    });

    it('calls openPanel when panel is not already open', () => {
      const mockDefinition = { id: 'f1-races', title: 'Races', component: vi.fn() };
      mockGetPanel.mockReturnValue(mockDefinition);
      setupPanelStore([]);

      const { result } = renderHook(() => useNavigateToPage());

      act(() => {
        result.current.navigateToPage({ targetPageId: 'f1-races', recordId: 'race-5' });
      });

      expect(mockOpenPanel).toHaveBeenCalledWith(mockDefinition, 'f1-races');
      expect(mockFocusPanel).not.toHaveBeenCalled();
    });

    it('calls focusPanel when panel is already open', () => {
      const mockDefinition = { id: 'f1-races', title: 'Races', component: vi.fn() };
      mockGetPanel.mockReturnValue(mockDefinition);
      setupPanelStore(['f1-races']); // Panel already open

      const { result } = renderHook(() => useNavigateToPage());

      act(() => {
        result.current.navigateToPage({ targetPageId: 'f1-races', recordId: 'race-5' });
      });

      expect(mockFocusPanel).toHaveBeenCalledWith('f1-races');
      expect(mockOpenPanel).not.toHaveBeenCalled();
    });

    it('always opens new panel when forceNewPanel=true', () => {
      const mockDefinition = { id: 'f1-races', title: 'Races', component: vi.fn() };
      mockGetPanel.mockReturnValue(mockDefinition);
      setupPanelStore(['f1-races']); // Panel already open

      const { result } = renderHook(() => useNavigateToPage());

      act(() => {
        result.current.navigateToPage({ targetPageId: 'f1-races' }, true);
      });

      // openPanel called with a unique panel ID (not the base pageId)
      expect(mockOpenPanel).toHaveBeenCalledWith(
        mockDefinition,
        expect.stringMatching(/^f1-races--\d+$/),
      );
      expect(mockFocusPanel).not.toHaveBeenCalled();
    });

    it('forceNewPanel=true stores intent with unique panel ID', () => {
      const mockDefinition = { id: 'f1-races', title: 'Races', component: vi.fn() };
      mockGetPanel.mockReturnValue(mockDefinition);
      setupPanelStore([]);

      const { result } = renderHook(() => useNavigateToPage());
      const intent = { targetPageId: 'f1-races', recordId: 'race-3' };

      act(() => {
        result.current.navigateToPage(intent, true);
      });

      // The intent key should be the unique panel ID (containing timestamp)
      const intents = useNavigationStore.getState().intents;
      const keys = Object.keys(intents);
      expect(keys).toHaveLength(1);
      expect(keys[0]).toMatch(/^f1-races--\d+$/);
      expect(intents[keys[0]]).toEqual(intent);
    });
  });

  describe('isPageRegistered', () => {
    it('returns true when panel registry has the page', () => {
      mockGetPanel.mockReturnValue({ id: 'f1-races', title: 'Races', component: vi.fn() });
      mockGetPageById.mockReturnValue(undefined);

      const { result } = renderHook(() => useNavigateToPage());
      expect(result.current.isPageRegistered('f1-races')).toBe(true);
    });

    it('returns true when page registry has the page', () => {
      mockGetPanel.mockReturnValue(undefined);
      mockGetPageById.mockReturnValue({ id: 'f1-races', name: 'Races', icon: 'Flag', template: 'table-listing' });

      const { result } = renderHook(() => useNavigateToPage());
      expect(result.current.isPageRegistered('f1-races')).toBe(true);
    });

    it('returns false when neither registry has the page', () => {
      mockGetPanel.mockReturnValue(undefined);
      mockGetPageById.mockReturnValue(undefined);

      const { result } = renderHook(() => useNavigateToPage());
      expect(result.current.isPageRegistered('nonexistent')).toBe(false);
    });
  });
});

/**
 * Unit tests for sidebarStore.
 *
 * Tests cover:
 * - Initial state (collapsed: false)
 * - Toggle behavior
 * - Persistence to localStorage via zustand/persist
 * - US-109: pinnedPages, togglePin, searchQuery, setSearchQuery
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSidebarStore } from '../sidebarStore';

describe('sidebarStore', () => {
  beforeEach(() => {
    // Reset the store to default state between tests
    useSidebarStore.setState({ collapsed: false, pinnedPages: [], searchQuery: '' });
    // Clear localStorage mock
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts with collapsed: false by default', () => {
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('toggles collapsed to true', () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('toggles collapsed back to false after two toggles', () => {
    useSidebarStore.getState().toggle();
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('persists state to localStorage with the correct key', () => {
    useSidebarStore.getState().toggle();
    // After toggle, the persist middleware should have written to localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'vastu-sidebar-state',
      expect.stringContaining('"collapsed":true'),
    );
  });

  it('has a toggle function defined', () => {
    expect(typeof useSidebarStore.getState().toggle).toBe('function');
  });

  // --- US-109 additions ---

  describe('togglePin', () => {
    it('starts with empty pinnedPages', () => {
      expect(useSidebarStore.getState().pinnedPages).toEqual([]);
    });

    it('pins a page that is not yet pinned', () => {
      useSidebarStore.getState().togglePin('dashboard');
      expect(useSidebarStore.getState().pinnedPages).toContain('dashboard');
    });

    it('unpins a page that is already pinned', () => {
      useSidebarStore.setState({ pinnedPages: ['dashboard'] });
      useSidebarStore.getState().togglePin('dashboard');
      expect(useSidebarStore.getState().pinnedPages).not.toContain('dashboard');
    });

    it('does not affect other pinned pages when unpinning one', () => {
      useSidebarStore.setState({ pinnedPages: ['dashboard', 'orders'] });
      useSidebarStore.getState().togglePin('dashboard');
      expect(useSidebarStore.getState().pinnedPages).toContain('orders');
    });

    it('persists pinnedPages to localStorage', () => {
      useSidebarStore.getState().togglePin('dashboard');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vastu-sidebar-state',
        expect.stringContaining('dashboard'),
      );
    });
  });

  describe('setSearchQuery', () => {
    it('starts with empty searchQuery', () => {
      expect(useSidebarStore.getState().searchQuery).toBe('');
    });

    it('updates searchQuery', () => {
      useSidebarStore.getState().setSearchQuery('orders');
      expect(useSidebarStore.getState().searchQuery).toBe('orders');
    });

    it('can clear searchQuery', () => {
      useSidebarStore.setState({ searchQuery: 'orders' });
      useSidebarStore.getState().setSearchQuery('');
      expect(useSidebarStore.getState().searchQuery).toBe('');
    });

    it('does not persist searchQuery to localStorage', () => {
      // searchQuery is ephemeral and excluded from partialize
      useSidebarStore.getState().setSearchQuery('test-query');
      // The stored state should NOT contain the search query
      const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      for (const [, value] of calls) {
        if (typeof value === 'string' && value.includes('vastu-sidebar')) {
          expect(value).not.toContain('test-query');
        }
      }
    });
  });
});

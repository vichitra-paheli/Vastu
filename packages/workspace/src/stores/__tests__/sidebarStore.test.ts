/**
 * Unit tests for sidebarStore.
 *
 * Tests cover:
 * - Initial state (collapsed: false)
 * - Toggle behavior
 * - Persistence to localStorage via zustand/persist
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSidebarStore } from '../sidebarStore';

describe('sidebarStore', () => {
  beforeEach(() => {
    // Reset the store to default state between tests
    useSidebarStore.setState({ collapsed: false });
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
});

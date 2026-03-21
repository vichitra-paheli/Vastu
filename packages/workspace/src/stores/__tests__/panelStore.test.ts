/**
 * Unit tests for panelStore (US-109 openPanel addition).
 *
 * Tests cover:
 * - openPanel: adds panel to openPanelIds and sets activePanelId
 * - openPanel: focuses existing panel without duplicating
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { usePanelStore } from '../panelStore';

describe('panelStore', () => {
  beforeEach(() => {
    usePanelStore.setState({ activePanelId: null, openPanelIds: [] });
  });

  it('starts with null activePanelId and empty openPanelIds', () => {
    const state = usePanelStore.getState();
    expect(state.activePanelId).toBeNull();
    expect(state.openPanelIds).toEqual([]);
  });

  describe('openPanel', () => {
    it('opens a new panel and sets it as active', () => {
      usePanelStore.getState().openPanel('dashboard');
      const state = usePanelStore.getState();
      expect(state.activePanelId).toBe('dashboard');
      expect(state.openPanelIds).toContain('dashboard');
    });

    it('focuses an existing panel without adding a duplicate', () => {
      usePanelStore.setState({ openPanelIds: ['dashboard'], activePanelId: 'dashboard' });
      usePanelStore.getState().openPanel('dashboard');
      const state = usePanelStore.getState();
      expect(state.openPanelIds).toEqual(['dashboard']);
      expect(state.openPanelIds.length).toBe(1);
    });

    it('can open multiple panels', () => {
      usePanelStore.getState().openPanel('dashboard');
      usePanelStore.getState().openPanel('orders');
      const state = usePanelStore.getState();
      expect(state.openPanelIds).toContain('dashboard');
      expect(state.openPanelIds).toContain('orders');
      expect(state.activePanelId).toBe('orders');
    });

    it('switches active panel when opening a different existing panel', () => {
      usePanelStore.setState({ openPanelIds: ['dashboard', 'orders'], activePanelId: 'dashboard' });
      usePanelStore.getState().openPanel('orders');
      expect(usePanelStore.getState().activePanelId).toBe('orders');
      expect(usePanelStore.getState().openPanelIds.length).toBe(2);
    });
  });
});

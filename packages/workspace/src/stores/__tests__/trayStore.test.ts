/**
 * Unit tests for trayStore (US-115).
 *
 * Tests cover:
 * - Initial state
 * - addToTray: adds item, prevents duplicates
 * - removeFromTray: removes item permanently
 * - restoreFromTray: removes item (open panel is caller's responsibility)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTrayStore } from '../trayStore';

function makeItem(panelId: string, title = `Panel ${panelId}`) {
  return { panelId, typeId: panelId, title, iconName: undefined };
}

describe('trayStore', () => {
  beforeEach(() => {
    useTrayStore.setState({ minimizedPanelIds: [], trayItems: [] });
  });

  describe('initial state', () => {
    it('starts with empty minimizedPanelIds', () => {
      expect(useTrayStore.getState().minimizedPanelIds).toEqual([]);
    });

    it('starts with empty trayItems', () => {
      expect(useTrayStore.getState().trayItems).toEqual([]);
    });
  });

  describe('addToTray', () => {
    it('adds an item to the tray', () => {
      useTrayStore.getState().addToTray(makeItem('p1'));
      expect(useTrayStore.getState().trayItems).toHaveLength(1);
      expect(useTrayStore.getState().trayItems[0].panelId).toBe('p1');
    });

    it('adds the panelId to minimizedPanelIds', () => {
      useTrayStore.getState().addToTray(makeItem('p1'));
      expect(useTrayStore.getState().minimizedPanelIds).toContain('p1');
    });

    it('preserves title and iconName', () => {
      useTrayStore.getState().addToTray({ panelId: 'p1', typeId: 'p1', title: 'My Panel', iconName: 'table' });
      const item = useTrayStore.getState().trayItems[0];
      expect(item.title).toBe('My Panel');
      expect(item.iconName).toBe('table');
    });

    it('does not add a duplicate if panelId already in tray', () => {
      useTrayStore.getState().addToTray(makeItem('p1'));
      useTrayStore.getState().addToTray(makeItem('p1'));
      expect(useTrayStore.getState().trayItems).toHaveLength(1);
    });

    it('adds multiple distinct panels', () => {
      useTrayStore.getState().addToTray(makeItem('p1'));
      useTrayStore.getState().addToTray(makeItem('p2'));
      expect(useTrayStore.getState().trayItems).toHaveLength(2);
    });
  });

  describe('removeFromTray', () => {
    it('removes an item from the tray', () => {
      useTrayStore.setState({
        minimizedPanelIds: ['p1', 'p2'],
        trayItems: [makeItem('p1'), makeItem('p2')],
      });
      useTrayStore.getState().removeFromTray('p1');
      expect(useTrayStore.getState().trayItems).toHaveLength(1);
      expect(useTrayStore.getState().trayItems[0].panelId).toBe('p2');
    });

    it('removes the panelId from minimizedPanelIds', () => {
      useTrayStore.setState({
        minimizedPanelIds: ['p1'],
        trayItems: [makeItem('p1')],
      });
      useTrayStore.getState().removeFromTray('p1');
      expect(useTrayStore.getState().minimizedPanelIds).not.toContain('p1');
    });

    it('is a no-op for a panelId not in the tray', () => {
      useTrayStore.setState({
        minimizedPanelIds: ['p1'],
        trayItems: [makeItem('p1')],
      });
      useTrayStore.getState().removeFromTray('nonexistent');
      expect(useTrayStore.getState().trayItems).toHaveLength(1);
    });
  });

  describe('restoreFromTray', () => {
    it('removes the item from trayItems', () => {
      useTrayStore.setState({
        minimizedPanelIds: ['p1'],
        trayItems: [makeItem('p1')],
      });
      useTrayStore.getState().restoreFromTray('p1');
      expect(useTrayStore.getState().trayItems).toHaveLength(0);
    });

    it('removes the panelId from minimizedPanelIds', () => {
      useTrayStore.setState({
        minimizedPanelIds: ['p1'],
        trayItems: [makeItem('p1')],
      });
      useTrayStore.getState().restoreFromTray('p1');
      expect(useTrayStore.getState().minimizedPanelIds).not.toContain('p1');
    });

    it('leaves other items intact', () => {
      useTrayStore.setState({
        minimizedPanelIds: ['p1', 'p2'],
        trayItems: [makeItem('p1'), makeItem('p2')],
      });
      useTrayStore.getState().restoreFromTray('p1');
      expect(useTrayStore.getState().trayItems[0].panelId).toBe('p2');
    });
  });
});

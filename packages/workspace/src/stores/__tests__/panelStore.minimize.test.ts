/**
 * Unit tests for panelStore minimize/restore (US-115).
 *
 * Tests cover:
 * - minimizePanel: adds to tray, removes from Dockview
 * - restorePanel: restores from tray back to Dockview
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePanelStore } from '../panelStore';
import { useTrayStore } from '../trayStore';
import { createMockDockviewApi, createMockPanel } from '../../test-utils/mock-dockview';
import { clearRegistry, registerPanel } from '../../panels/registry';
import type { PanelDefinition } from '../../types/panel';

// Minimal stub component
const StubComponent = () => React.createElement('div', null, 'stub');

function makeDefinition(id: string, iconName?: string): PanelDefinition {
  return { id, title: `Panel ${id}`, component: StubComponent, iconName };
}

describe('panelStore — minimizePanel / restorePanel', () => {
  beforeEach(() => {
    usePanelStore.setState({
      api: null,
      activePanelId: null,
      openPanelIds: [],
      layout: null,
    });
    useTrayStore.setState({ minimizedPanelIds: [], trayItems: [] });
    clearRegistry();
    vi.clearAllMocks();
  });

  describe('minimizePanel', () => {
    it('is a no-op when api is not set', () => {
      usePanelStore.getState().minimizePanel('p1');
      expect(useTrayStore.getState().trayItems).toHaveLength(0);
    });

    it('is a no-op when the panel is not in Dockview', () => {
      const api = createMockDockviewApi();
      vi.mocked(api.getPanel).mockReturnValue(undefined);
      usePanelStore.getState().setApi(api);
      usePanelStore.getState().minimizePanel('nonexistent');
      expect(useTrayStore.getState().trayItems).toHaveLength(0);
    });

    it('adds the panel to the tray', () => {
      const api = createMockDockviewApi();
      const panel = createMockPanel('p1');
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.setState({ openPanelIds: ['p1'], activePanelId: 'p1' });

      usePanelStore.getState().minimizePanel('p1');

      expect(useTrayStore.getState().trayItems).toHaveLength(1);
      expect(useTrayStore.getState().trayItems[0].panelId).toBe('p1');
    });

    it('removes the panel from openPanelIds', () => {
      const api = createMockDockviewApi();
      const panel = createMockPanel('p1');
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.setState({ openPanelIds: ['p1', 'p2'] });

      usePanelStore.getState().minimizePanel('p1');

      expect(usePanelStore.getState().openPanelIds).toEqual(['p2']);
    });

    it('clears activePanelId when the active panel is minimized', () => {
      const api = createMockDockviewApi();
      const panel = createMockPanel('p1');
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.setState({ openPanelIds: ['p1'], activePanelId: 'p1' });

      usePanelStore.getState().minimizePanel('p1');

      expect(usePanelStore.getState().activePanelId).toBeNull();
    });

    it('calls api.removePanel', () => {
      const api = createMockDockviewApi();
      const panel = createMockPanel('p1');
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.setState({ openPanelIds: ['p1'] });

      usePanelStore.getState().minimizePanel('p1');

      expect(api.removePanel).toHaveBeenCalledWith(panel);
    });

    it('includes iconName from the registry in the tray item', () => {
      const api = createMockDockviewApi();
      registerPanel(makeDefinition('welcome', 'table'));
      const panel = createMockPanel('welcome');
      // Simulate panel.params containing panelTypeId
      Object.assign(panel, { params: { panelTypeId: 'welcome' } });
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.setState({ openPanelIds: ['welcome'] });

      usePanelStore.getState().minimizePanel('welcome');

      const item = useTrayStore.getState().trayItems[0];
      expect(item.iconName).toBe('table');
    });
  });

  describe('restorePanel', () => {
    it('removes the item from the tray', () => {
      useTrayStore.setState({
        minimizedPanelIds: ['p1'],
        trayItems: [{ panelId: 'p1', title: 'Panel p1' }],
      });

      usePanelStore.getState().restorePanel('p1');

      expect(useTrayStore.getState().trayItems).toHaveLength(0);
    });

    it('does not open a panel when there is no registered definition', () => {
      const api = createMockDockviewApi();
      usePanelStore.getState().setApi(api);
      useTrayStore.setState({
        minimizedPanelIds: ['unknown-panel'],
        trayItems: [{ panelId: 'unknown-panel', title: 'Unknown' }],
      });

      // Should not throw
      expect(() => usePanelStore.getState().restorePanel('unknown-panel')).not.toThrow();
      expect(api.addPanel).not.toHaveBeenCalled();
    });

    it('opens the panel via openPanel when a definition is registered', () => {
      const api = createMockDockviewApi();
      registerPanel(makeDefinition('welcome'));
      usePanelStore.getState().setApi(api);
      useTrayStore.setState({
        minimizedPanelIds: ['welcome'],
        trayItems: [{ panelId: 'welcome', title: 'Panel welcome' }],
      });

      usePanelStore.getState().restorePanel('welcome');

      expect(api.addPanel).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'welcome' }),
      );
    });

    it('removes item from tray even without api', () => {
      useTrayStore.setState({
        minimizedPanelIds: ['p1'],
        trayItems: [{ panelId: 'p1', title: 'Panel p1' }],
      });

      usePanelStore.getState().restorePanel('p1');

      expect(useTrayStore.getState().trayItems).toHaveLength(0);
    });
  });
});

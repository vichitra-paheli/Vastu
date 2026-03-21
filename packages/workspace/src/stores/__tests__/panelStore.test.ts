/**
 * Unit tests for panelStore.
 *
 * Tests cover:
 * - Initial state
 * - setApi
 * - openPanel: adds panel, focuses if already open
 * - closePanel: removes panel
 * - focusPanel: calls setActive
 * - serializeLayout: calls api.toJSON
 * - restoreLayout: calls api.fromJSON, handles corruption
 * - setLayout / layout round-trip
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePanelStore } from '../panelStore';
import { createMockDockviewApi, createMockPanel } from '../../test-utils/mock-dockview';
import { clearRegistry } from '../../panels/registry';
import type { PanelDefinition } from '../../types/panel';

// Minimal stub component
const StubComponent = () => React.createElement('div', null, 'stub');

function makeDefinition(id: string): PanelDefinition {
  return { id, title: `Panel ${id}`, component: StubComponent };
}

describe('panelStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePanelStore.setState({
      api: null,
      activePanelId: null,
      openPanelIds: [],
      layout: null,
    });
    clearRegistry();
  });

  describe('initial state', () => {
    it('has null api', () => {
      expect(usePanelStore.getState().api).toBeNull();
    });

    it('has null activePanelId', () => {
      expect(usePanelStore.getState().activePanelId).toBeNull();
    });

    it('has empty openPanelIds', () => {
      expect(usePanelStore.getState().openPanelIds).toEqual([]);
    });

    it('has null layout', () => {
      expect(usePanelStore.getState().layout).toBeNull();
    });
  });

  describe('setApi', () => {
    it('stores the api reference', () => {
      const api = createMockDockviewApi();
      usePanelStore.getState().setApi(api);
      expect(usePanelStore.getState().api).toBe(api);
    });
  });

  describe('openPanel', () => {
    it('is a no-op when api is not set', () => {
      const def = makeDefinition('test');
      // Should not throw
      usePanelStore.getState().openPanel(def);
      expect(usePanelStore.getState().openPanelIds).toEqual([]);
    });

    it('calls api.addPanel with the correct arguments', () => {
      const api = createMockDockviewApi();
      usePanelStore.getState().setApi(api);
      const def = makeDefinition('my-panel');
      usePanelStore.getState().openPanel(def);
      expect(api.addPanel).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'my-panel', component: 'my-panel' }),
      );
    });

    it('adds the panel ID to openPanelIds', () => {
      const api = createMockDockviewApi();
      usePanelStore.getState().setApi(api);
      usePanelStore.getState().openPanel(makeDefinition('p1'));
      expect(usePanelStore.getState().openPanelIds).toContain('p1');
    });

    it('sets activePanelId to the new panel', () => {
      const api = createMockDockviewApi();
      usePanelStore.getState().setApi(api);
      usePanelStore.getState().openPanel(makeDefinition('p1'));
      expect(usePanelStore.getState().activePanelId).toBe('p1');
    });

    it('focuses existing panel instead of opening duplicate', () => {
      const api = createMockDockviewApi();
      const existingPanel = createMockPanel('existing');
      vi.mocked(api.getPanel).mockReturnValue(existingPanel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.getState().openPanel(makeDefinition('existing'));
      // Should call setActive on the existing panel, not addPanel
      expect(existingPanel.api.setActive).toHaveBeenCalled();
      expect(api.addPanel).not.toHaveBeenCalled();
    });

    it('uses a custom panelId when provided', () => {
      const api = createMockDockviewApi();
      usePanelStore.getState().setApi(api);
      usePanelStore.getState().openPanel(makeDefinition('my-type'), 'custom-instance-id');
      expect(api.addPanel).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'custom-instance-id' }),
      );
    });
  });

  describe('closePanel', () => {
    it('is a no-op when api is not set', () => {
      usePanelStore.setState({ openPanelIds: ['p1'] });
      usePanelStore.getState().closePanel('p1');
      // State unchanged
      expect(usePanelStore.getState().openPanelIds).toEqual(['p1']);
    });

    it('is a no-op when panel does not exist', () => {
      const api = createMockDockviewApi();
      vi.mocked(api.getPanel).mockReturnValue(undefined);
      usePanelStore.getState().setApi(api);
      usePanelStore.getState().closePanel('nonexistent');
      expect(api.removePanel).not.toHaveBeenCalled();
    });

    it('calls api.removePanel for an existing panel', () => {
      const api = createMockDockviewApi();
      const panel = createMockPanel('p1');
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.setState({ openPanelIds: ['p1'], activePanelId: 'p1' });
      usePanelStore.getState().closePanel('p1');
      expect(api.removePanel).toHaveBeenCalledWith(panel);
    });

    it('removes the panel from openPanelIds', () => {
      const api = createMockDockviewApi();
      const panel = createMockPanel('p1');
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.setState({ openPanelIds: ['p1', 'p2'] });
      usePanelStore.getState().closePanel('p1');
      expect(usePanelStore.getState().openPanelIds).toEqual(['p2']);
    });

    it('clears activePanelId when the active panel is closed', () => {
      const api = createMockDockviewApi();
      const panel = createMockPanel('p1');
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.setState({ openPanelIds: ['p1'], activePanelId: 'p1' });
      usePanelStore.getState().closePanel('p1');
      expect(usePanelStore.getState().activePanelId).toBeNull();
    });
  });

  describe('focusPanel', () => {
    it('calls setActive on the panel', () => {
      const api = createMockDockviewApi();
      const panel = createMockPanel('p1');
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.getState().focusPanel('p1');
      expect(panel.api.setActive).toHaveBeenCalled();
    });

    it('sets activePanelId', () => {
      const api = createMockDockviewApi();
      const panel = createMockPanel('p1');
      vi.mocked(api.getPanel).mockReturnValue(panel as never);
      usePanelStore.getState().setApi(api);
      usePanelStore.getState().focusPanel('p1');
      expect(usePanelStore.getState().activePanelId).toBe('p1');
    });
  });

  describe('serializeLayout', () => {
    it('returns null when api is not set', () => {
      expect(usePanelStore.getState().serializeLayout()).toBeNull();
    });

    it('calls api.toJSON and returns the result', () => {
      const api = createMockDockviewApi();
      usePanelStore.getState().setApi(api);
      const result = usePanelStore.getState().serializeLayout();
      expect(api.toJSON).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('restoreLayout', () => {
    it('calls api.fromJSON with the provided layout', () => {
      const api = createMockDockviewApi();
      vi.mocked(api.panels as unknown[]).length = 0;
      const layout = api.toJSON();
      usePanelStore.getState().restoreLayout(api, layout);
      expect(api.fromJSON).toHaveBeenCalledWith(layout);
    });

    it('skips restoration when no layout is provided and store has no layout', () => {
      const api = createMockDockviewApi();
      usePanelStore.getState().restoreLayout(api);
      expect(api.fromJSON).not.toHaveBeenCalled();
    });

    it('uses stored layout when no argument is passed', () => {
      const api = createMockDockviewApi();
      const layout = api.toJSON();
      usePanelStore.setState({ layout });
      usePanelStore.getState().restoreLayout(api);
      expect(api.fromJSON).toHaveBeenCalledWith(layout);
    });

    it('handles corrupted layout gracefully', () => {
      const api = createMockDockviewApi();
      vi.mocked(api.fromJSON).mockImplementationOnce(() => {
        throw new Error('corrupt layout');
      });
      const layout = api.toJSON();
      // Should not throw
      expect(() => usePanelStore.getState().restoreLayout(api, layout)).not.toThrow();
      // Layout should be cleared from state
      expect(usePanelStore.getState().layout).toBeNull();
    });
  });

  describe('setLayout', () => {
    it('updates the stored layout', () => {
      const api = createMockDockviewApi();
      const layout = api.toJSON();
      usePanelStore.getState().setLayout(layout);
      expect(usePanelStore.getState().layout).toBe(layout);
    });
  });
});

/**
 * mock-dockview.ts — test helpers for Dockview-dependent components.
 *
 * Usage:
 *   import { createMockDockviewApi, createMockPanelApi } from '../test-utils/mock-dockview';
 *
 * The mock API implements the minimal surface needed to test panel store
 * operations and DockviewHost without a real browser DOM.
 */

import { vi } from 'vitest';
import type { DockviewApi } from 'dockview-core';
import type { SerializedDockview } from 'dockview-core';
import { Orientation } from 'dockview-core';

/**
 * Minimal mock for DockviewPanelApi — the per-panel API.
 */
export function createMockPanelApi(id = 'mock-panel') {
  return {
    id,
    title: id,
    setActive: vi.fn(),
    close: vi.fn(),
    setTitle: vi.fn(),
    onDidTitleChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidActiveGroupChange: vi.fn(() => ({ dispose: vi.fn() })),
    isActive: false,
    group: {},
    isGroupActive: false,
    location: { type: 'grid' as const },
    renderer: 'onlyWhenVisible' as const,
    tabComponent: undefined,
    onDidGroupChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidRendererChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidLocationChange: vi.fn(() => ({ dispose: vi.fn() })),
    maximize: vi.fn(),
    isMaximized: vi.fn(() => false),
    exitMaximized: vi.fn(),
    moveTo: vi.fn(),
    setRenderer: vi.fn(),
    getWindow: vi.fn(() => window),
    width: 0,
    height: 0,
    onDidDimensionsChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidFocusChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidVisibilityChange: vi.fn(() => ({ dispose: vi.fn() })),
    setConstraints: vi.fn(),
    setVisible: vi.fn(),
    isFocused: false,
    isVisible: true,
  };
}

/**
 * Create a mock IDockviewPanel.
 */
export function createMockPanel(id = 'mock-panel') {
  return {
    id,
    title: id,
    api: createMockPanelApi(id),
    view: {} as never,
    group: {} as never,
    params: {},
    update: vi.fn(),
    dispose: vi.fn(),
    init: vi.fn(),
    setVisible: vi.fn(),
    onDidStateChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDispose: vi.fn(() => ({ dispose: vi.fn() })),
  };
}

/**
 * Create a minimal mock DockviewApi for use in panelStore tests.
 *
 * Tracks addPanel / removePanel calls and maintains a fake panels list.
 */
export function createMockDockviewApi(): DockviewApi {
  const panels: ReturnType<typeof createMockPanel>[] = [];
  let _activePanel: ReturnType<typeof createMockPanel> | undefined;

  const api = {
    id: 'mock-dockview',
    panels,
    get activePanel() {
      return _activePanel;
    },
    addPanel: vi.fn((options: { id: string; title?: string; component: string }) => {
      const panel = createMockPanel(options.id);
      panels.push(panel);
      _activePanel = panel;
      return panel;
    }),
    removePanel: vi.fn((panel: ReturnType<typeof createMockPanel>) => {
      const index = panels.findIndex((p) => p.id === panel.id);
      if (index !== -1) panels.splice(index, 1);
      if (_activePanel?.id === panel.id) _activePanel = panels[panels.length - 1];
    }),
    getPanel: vi.fn((id: string) => panels.find((p) => p.id === id)),
    toJSON: vi.fn(
      (): SerializedDockview => ({
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
      }),
    ),
    fromJSON: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    onDidLayoutChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidLayoutFromJSON: vi.fn(() => ({ dispose: vi.fn() })),
    onDidAddPanel: vi.fn(() => ({ dispose: vi.fn() })),
    onDidRemovePanel: vi.fn(() => ({ dispose: vi.fn() })),
    onDidActivePanelChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidAddGroup: vi.fn(() => ({ dispose: vi.fn() })),
    onDidRemoveGroup: vi.fn(() => ({ dispose: vi.fn() })),
    onDidActiveGroupChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidMovePanel: vi.fn(() => ({ dispose: vi.fn() })),
    onWillDragPanel: vi.fn(() => ({ dispose: vi.fn() })),
    onWillDragGroup: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDrop: vi.fn(() => ({ dispose: vi.fn() })),
    onWillDrop: vi.fn(() => ({ dispose: vi.fn() })),
    onWillShowOverlay: vi.fn(() => ({ dispose: vi.fn() })),
    onDidMaximizedGroupChange: vi.fn(() => ({ dispose: vi.fn() })),
    onUnhandledDragOverEvent: vi.fn(() => ({ dispose: vi.fn() })),
    width: 800,
    height: 600,
    size: { width: 800, height: 600 },
    groups: [],
    totalPanels: 0,
    hasMaximizedGroup: vi.fn(() => false),
    isMaximizedGroup: vi.fn(() => false),
    maximizeGroup: vi.fn(),
    exitMaximizedGroup: vi.fn(),
    setVisible: vi.fn(),
    updateOptions: vi.fn(),
    focus: vi.fn(),
    getGroup: vi.fn(),
    moveGroupOrPanel: vi.fn(),
    addGroup: vi.fn(),
    removeGroup: vi.fn(),
    createDragTarget: vi.fn(),
  } as unknown as DockviewApi;

  return api;
}

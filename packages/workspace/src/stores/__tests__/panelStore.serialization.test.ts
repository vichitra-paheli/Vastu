/**
 * Serialization round-trip tests for panelStore.
 *
 * Tests that serializeLayout → restoreLayout produces the same layout.
 * Uses the mock Dockview API to simulate the full cycle.
 *
 * Implements AC-7: Panel state serializable to JSON.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePanelStore } from '../panelStore';
import { createMockDockviewApi } from '../../test-utils/mock-dockview';
import type { SerializedLayout } from '../../types/panel';

describe('panelStore serialization round-trip', () => {
  beforeEach(() => {
    usePanelStore.setState({
      api: null,
      activePanelId: null,
      openPanelIds: [],
      layout: null,
    });
  });

  it('serializes and restores an empty layout', () => {
    const api = createMockDockviewApi();
    usePanelStore.getState().setApi(api);

    const serialized = usePanelStore.getState().serializeLayout();
    expect(serialized).not.toBeNull();

    // Restore to a fresh API instance
    const api2 = createMockDockviewApi();
    usePanelStore.getState().restoreLayout(api2, serialized as SerializedLayout);

    expect(api2.fromJSON).toHaveBeenCalledWith(serialized);
  });

  it('stores the serialized layout in state via setLayout', () => {
    const api = createMockDockviewApi();
    usePanelStore.getState().setApi(api);

    const serialized = usePanelStore.getState().serializeLayout();
    expect(serialized).not.toBeNull();

    usePanelStore.getState().setLayout(serialized as SerializedLayout);
    expect(usePanelStore.getState().layout).toEqual(serialized);
  });

  it('round-trips: setLayout → restoreLayout uses stored layout', () => {
    const api = createMockDockviewApi();
    usePanelStore.getState().setApi(api);

    const serialized = usePanelStore.getState().serializeLayout();
    usePanelStore.getState().setLayout(serialized as SerializedLayout);

    // New api instance — restoreLayout without explicit layout arg uses stored layout
    const api2 = createMockDockviewApi();
    usePanelStore.getState().restoreLayout(api2);
    expect(api2.fromJSON).toHaveBeenCalledWith(serialized);
  });

  it('serialized layout is JSON-serializable', () => {
    const api = createMockDockviewApi();
    usePanelStore.getState().setApi(api);

    const serialized = usePanelStore.getState().serializeLayout();
    // Should not throw
    expect(() => JSON.stringify(serialized)).not.toThrow();
    // Should round-trip through JSON
    const roundTripped = JSON.parse(JSON.stringify(serialized)) as SerializedLayout;
    expect(roundTripped).toEqual(serialized);
  });
});

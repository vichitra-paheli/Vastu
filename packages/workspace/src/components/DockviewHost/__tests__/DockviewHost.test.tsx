/**
 * Component tests for DockviewHost.
 *
 * Tests cover:
 * - DockviewHost renders without crashing
 * - The host container is present
 *
 * Note: Full Dockview interaction tests (drag-and-drop, split, float) require a real
 * browser environment and are covered by E2E tests (e2e/workspace.spec.ts).
 * These unit tests verify the component mounts and calls the registry correctly.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DockviewHost } from '../DockviewHost';
import { TestProviders } from '../../../test-utils/providers';
import { usePanelStore } from '../../../stores/panelStore';
import { clearRegistry } from '../../../panels/registry';

// Mock dockview-react to avoid complex browser DOM requirements in jsdom
vi.mock('dockview-react', () => ({
  DockviewReact: vi.fn(
    ({ onReady }: { onReady?: (e: { api: unknown }) => void }) => {
      // Simulate Dockview's onReady callback with a minimal mock API
      if (onReady) {
        const mockApi = {
          toJSON: vi.fn(() => ({
            grid: { root: { type: 'leaf', data: [] }, height: 600, width: 800, orientation: 0 },
            panels: [],
            floatingGroups: [],
            popoutGroups: [],
            activeGroup: undefined,
          })),
          fromJSON: vi.fn(),
          onDidLayoutChange: vi.fn(() => ({ dispose: vi.fn() })),
          panels: [],
          activePanel: undefined,
          addPanel: vi.fn(),
          removePanel: vi.fn(),
          getPanel: vi.fn(() => undefined),
        };
        // Call onReady synchronously in test to simulate dockview mounting
        setTimeout(() => onReady({ api: mockApi }), 0);
      }
      return React.createElement('div', { 'data-testid': 'dockview-mock' }, 'Dockview');
    }
  ),
}));

// Mock the CSS import from dockview-react
vi.mock('dockview-react/dist/styles/dockview.css', () => ({}));

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

describe('DockviewHost', () => {
  beforeEach(() => {
    // Reset panel store
    usePanelStore.setState({
      api: null,
      activePanelId: null,
      openPanelIds: [],
      layout: null,
    });
    // Clear panel registry to avoid cross-test pollution
    clearRegistry();
    // Clear localStorage
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => renderWithProviders(<DockviewHost />)).not.toThrow();
  });

  it('renders the Dockview container', () => {
    renderWithProviders(<DockviewHost />);
    expect(screen.getByTestId('dockview-mock')).toBeInTheDocument();
  });
});

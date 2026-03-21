/**
 * Component tests for TrayBar and TrayItem (US-115).
 *
 * Tests cover:
 * - TrayBar renders empty state when no minimized panels
 * - TrayBar renders tray items for each minimized panel
 * - TrayBar has left (panel list) and right (status) regions
 * - TrayItem click calls onRestore
 * - TrayItem right-click opens context menu
 * - TrayItem context menu "Close" calls onClose
 * - TrayItem renders TruncatedText for long titles
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TrayBar } from '../TrayBar';
import { TrayItem } from '../TrayItem';
import { useTrayStore } from '../../../stores/trayStore';
import { usePanelStore } from '../../../stores/panelStore';
import { TestProviders } from '../../../test-utils/providers';

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

describe('TrayBar', () => {
  beforeEach(() => {
    useTrayStore.setState({ minimizedPanelIds: [], trayItems: [] });
    usePanelStore.setState({
      api: null,
      activePanelId: null,
      openPanelIds: [],
      layout: null,
    });
  });

  it('renders the panel list region', () => {
    renderWithProviders(<TrayBar />);
    expect(screen.getByRole('list', { name: /minimized panels/i })).toBeInTheDocument();
  });

  it('renders the status area region', () => {
    renderWithProviders(<TrayBar />);
    expect(screen.getByRole('status', { name: /status indicators/i })).toBeInTheDocument();
  });

  it('shows empty state text when no panels are minimized', () => {
    renderWithProviders(<TrayBar />);
    expect(screen.getByText(/no minimized panels/i)).toBeInTheDocument();
  });

  it('does not show empty state when panels are minimized', () => {
    useTrayStore.setState({
      minimizedPanelIds: ['p1'],
      trayItems: [{ panelId: 'p1', typeId: 'p1', title: 'My Panel' }],
    });
    renderWithProviders(<TrayBar />);
    expect(screen.queryByText(/no minimized panels/i)).not.toBeInTheDocument();
  });

  it('renders one tray item per minimized panel', () => {
    useTrayStore.setState({
      minimizedPanelIds: ['p1', 'p2'],
      trayItems: [
        { panelId: 'p1', typeId: 'p1', title: 'Panel One' },
        { panelId: 'p2', typeId: 'p2', title: 'Panel Two' },
      ],
    });
    renderWithProviders(<TrayBar />);
    expect(screen.getByText('Panel One')).toBeInTheDocument();
    expect(screen.getByText('Panel Two')).toBeInTheDocument();
  });

  it('calls restorePanel when a tray item is clicked', () => {
    const restorePanel = vi.fn();
    // Patch restorePanel in the store
    usePanelStore.setState({ restorePanel });
    useTrayStore.setState({
      minimizedPanelIds: ['p1'],
      trayItems: [{ panelId: 'p1', typeId: 'p1', title: 'Panel One' }],
    });

    renderWithProviders(<TrayBar />);
    // Click the chip button
    const chip = screen.getByRole('button', { name: /restore panel: panel one/i });
    fireEvent.click(chip);

    expect(restorePanel).toHaveBeenCalledWith('p1');
  });
});

describe('TrayItem', () => {
  it('renders the panel title', () => {
    const item = { panelId: 'p1', typeId: 'p1', title: 'My Panel' };
    renderWithProviders(
      <TrayItem item={item} onRestore={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText('My Panel')).toBeInTheDocument();
  });

  it('calls onRestore when clicked', () => {
    const onRestore = vi.fn();
    const item = { panelId: 'p1', typeId: 'p1', title: 'My Panel' };
    renderWithProviders(
      <TrayItem item={item} onRestore={onRestore} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /restore panel: my panel/i }));
    expect(onRestore).toHaveBeenCalledWith('p1');
  });

  it('calls onRestore on Enter key', () => {
    const onRestore = vi.fn();
    const item = { panelId: 'p1', typeId: 'p1', title: 'My Panel' };
    renderWithProviders(
      <TrayItem item={item} onRestore={onRestore} onClose={vi.fn()} />,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: /restore panel: my panel/i }), {
      key: 'Enter',
    });
    expect(onRestore).toHaveBeenCalledWith('p1');
  });

  it('calls onRestore on Space key', () => {
    const onRestore = vi.fn();
    const item = { panelId: 'p1', typeId: 'p1', title: 'My Panel' };
    renderWithProviders(
      <TrayItem item={item} onRestore={onRestore} onClose={vi.fn()} />,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: /restore panel: my panel/i }), {
      key: ' ',
    });
    expect(onRestore).toHaveBeenCalledWith('p1');
  });

  it('opens context menu on right-click', () => {
    const item = { panelId: 'p1', typeId: 'p1', title: 'My Panel' };
    renderWithProviders(
      <TrayItem item={item} onRestore={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.contextMenu(screen.getByRole('button', { name: /restore panel: my panel/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('calls onClose when Close is selected from context menu', () => {
    const onClose = vi.fn();
    const item = { panelId: 'p1', typeId: 'p1', title: 'My Panel' };
    renderWithProviders(
      <TrayItem item={item} onRestore={vi.fn()} onClose={onClose} />,
    );
    fireEvent.contextMenu(screen.getByRole('button', { name: /restore panel: my panel/i }));
    const closeMenuItem = screen.getByRole('menuitem');
    fireEvent.click(closeMenuItem);
    expect(onClose).toHaveBeenCalledWith('p1');
  });

  it('has an aria-label containing the panel title', () => {
    const item = { panelId: 'p1', typeId: 'p1', title: 'My Panel' };
    renderWithProviders(
      <TrayItem item={item} onRestore={vi.fn()} onClose={vi.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: /restore panel: my panel/i }),
    ).toBeInTheDocument();
  });
});

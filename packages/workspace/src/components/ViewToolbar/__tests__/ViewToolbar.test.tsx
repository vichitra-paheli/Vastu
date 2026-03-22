/**
 * ViewToolbar component tests.
 *
 * Covers:
 * - Renders toolbar with role="toolbar"
 * - Renders view name input
 * - Save button present and disabled when view is unmodified
 * - Save button enabled and styled when view is modified
 * - Modified indicator (dot + label + Reset button) visible only when modified
 * - Reset button is disabled (not hidden) when view is clean (AC-6)
 * - Reset button calls resetView
 * - Inline view name editing: blur commits, Escape reverts
 * - ViewSelector trigger renders
 * - ViewSelector shows ConfirmDialog on delete click (AC-7)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { ViewToolbar } from '../ViewToolbar';
import { ViewSelector } from '../ViewSelector';
import { useViewStore } from '../../../stores/viewStore';
import type { View } from '@vastu/shared/types';

// Minimal View fixture
const mockView: View = {
  id: 'view-1',
  name: 'My Test View',
  pageId: 'page-1',
  stateJson: {
    filters: null,
    sort: [],
    columns: [],
    pagination: { page: 1, pageSize: 25 },
    scrollPosition: { x: 0, y: 0 },
  },
  createdBy: 'user-1',
  isShared: false,
  colorDot: '#2378CB',
  organizationId: 'org-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function renderToolbar(props?: Partial<React.ComponentProps<typeof ViewToolbar>>) {
  return render(
    <ViewToolbar pageId="page-1" {...props} />,
    { wrapper: TestProviders },
  );
}

describe('ViewToolbar', () => {
  beforeEach(() => {
    // Reset viewStore to a clean state before each test.
    useViewStore.setState({
      currentViewId: null,
      savedState: null,
      currentState: {
        filters: null,
        sort: [],
        columns: [],
        pagination: { page: 1, pageSize: 25 },
        scrollPosition: { x: 0, y: 0 },
      },
    });
    // Only clear call history, not implementations — restoreAllMocks would
    // undo the window.matchMedia polyfill set in setup.ts and break Mantine hooks.
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // Structure
  // ----------------------------------------------------------------

  it('renders a toolbar landmark', () => {
    renderToolbar();
    expect(screen.getByRole('toolbar', { name: /view toolbar/i })).toBeTruthy();
  });

  it('renders the view name input', () => {
    renderToolbar();
    expect(screen.getByRole('textbox', { name: /view name/i })).toBeTruthy();
  });

  it('renders the save button', () => {
    renderToolbar();
    expect(screen.getByTestId('save-button')).toBeTruthy();
  });

  it('renders the share button', () => {
    renderToolbar();
    expect(screen.getByTestId('share-button')).toBeTruthy();
  });

  it('renders the overflow button', () => {
    renderToolbar();
    expect(screen.getByTestId('overflow-button')).toBeTruthy();
  });

  // ----------------------------------------------------------------
  // Modified state
  // ----------------------------------------------------------------

  it('does not show modified indicator when view is clean', () => {
    // No savedState → isModified returns false
    renderToolbar();
    expect(screen.queryByTestId('modified-indicator')).toBeNull();
  });

  it('save button is disabled when view is clean', () => {
    renderToolbar();
    const saveBtn = screen.getByTestId('save-button');
    expect(saveBtn).toBeDisabled();
  });

  it('reset button is rendered but disabled when view is clean (AC-6)', () => {
    renderToolbar();
    // Reset button is always present (not hidden) — just disabled when clean.
    const resetBtn = screen.getByTestId('reset-button');
    expect(resetBtn).toBeDisabled();
  });

  it('shows modified indicator when view state differs from saved', () => {
    // Set a saved state, then mutate the current state to make it modified.
    const savedState = {
      filters: null,
      sort: [],
      columns: [],
      pagination: { page: 1, pageSize: 25 },
      scrollPosition: { x: 0, y: 0 },
    };
    useViewStore.setState({
      currentViewId: 'view-1',
      savedState,
      currentState: {
        ...savedState,
        pagination: { page: 2, pageSize: 25 },
      },
    });

    renderToolbar({ views: [mockView] });
    expect(screen.getByTestId('modified-indicator')).toBeTruthy();
    expect(screen.getByText('Modified')).toBeTruthy();
    expect(screen.getByRole('button', { name: /reset view/i })).toBeTruthy();
  });

  it('save button is enabled when view is modified', () => {
    const savedState = {
      filters: null,
      sort: [],
      columns: [],
      pagination: { page: 1, pageSize: 25 },
      scrollPosition: { x: 0, y: 0 },
    };
    useViewStore.setState({
      currentViewId: 'view-1',
      savedState,
      currentState: {
        ...savedState,
        pagination: { page: 2, pageSize: 25 },
      },
    });

    renderToolbar({ views: [mockView] });
    const saveBtn = screen.getByTestId('save-button');
    expect(saveBtn).not.toBeDisabled();
  });

  // ----------------------------------------------------------------
  // Reset action
  // ----------------------------------------------------------------

  it('clicking Reset calls resetView and removes modified indicator', () => {
    const savedState = {
      filters: null,
      sort: [],
      columns: [],
      pagination: { page: 1, pageSize: 25 },
      scrollPosition: { x: 0, y: 0 },
    };
    useViewStore.setState({
      currentViewId: 'view-1',
      savedState,
      currentState: {
        ...savedState,
        pagination: { page: 3, pageSize: 25 },
      },
    });

    renderToolbar({ views: [mockView] });
    const resetBtn = screen.getByTestId('reset-button');
    expect(resetBtn).not.toBeDisabled();
    fireEvent.click(resetBtn);

    // After reset the indicator should disappear.
    expect(screen.queryByTestId('modified-indicator')).toBeNull();
    // Reset button should now be disabled (view is clean after reset).
    expect(screen.getByTestId('reset-button')).toBeDisabled();
  });

  // ----------------------------------------------------------------
  // View name editing
  // ----------------------------------------------------------------

  it('shows the active view name when a view is loaded', () => {
    useViewStore.setState({
      currentViewId: mockView.id,
      savedState: mockView.stateJson,
      currentState: mockView.stateJson,
    });
    renderToolbar({ views: [mockView] });
    const input = screen.getByRole('textbox', { name: /view name/i }) as HTMLInputElement;
    expect(input.value).toBe('My Test View');
  });

  it('shows default label when no view is loaded', () => {
    renderToolbar();
    const input = screen.getByRole('textbox', { name: /view name/i }) as HTMLInputElement;
    expect(input.value).toBe('Default view');
  });

  it('updates local name when user types in the name input', () => {
    renderToolbar();
    const input = screen.getByRole('textbox', { name: /view name/i }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My New View' } });
    expect(input.value).toBe('My New View');
  });

  it('pressing Escape reverts the name to the previous value', () => {
    useViewStore.setState({
      currentViewId: mockView.id,
      savedState: mockView.stateJson,
      currentState: mockView.stateJson,
    });
    renderToolbar({ views: [mockView] });
    const input = screen.getByRole('textbox', { name: /view name/i }) as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Typo Name' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('My Test View');
  });

  it('pressing Enter commits the name (blurs input)', () => {
    renderToolbar();
    const input = screen.getByRole('textbox', { name: /view name/i }) as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // After Enter the value should be committed (not reverted).
    expect(input.value).toBe('New Name');
  });

  // ----------------------------------------------------------------
  // Save integration
  // ----------------------------------------------------------------

  it('calls saveView when Save button is clicked while modified', async () => {
    const savedState = {
      filters: null,
      sort: [],
      columns: [],
      pagination: { page: 1, pageSize: 25 },
      scrollPosition: { x: 0, y: 0 },
    };
    useViewStore.setState({
      currentViewId: 'view-1',
      savedState,
      currentState: {
        ...savedState,
        pagination: { page: 2, pageSize: 25 },
      },
    });

    // Mock fetch so saveView doesn't throw.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'view-1' }),
      }),
    );

    renderToolbar({ views: [mockView] });
    const saveBtn = screen.getByTestId('save-button');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // ViewSelector present
  // ----------------------------------------------------------------

  it('renders the view selector trigger', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /switch view/i })).toBeTruthy();
  });

  // ----------------------------------------------------------------
  // pageId prop used as the page ID for saves (AC-4)
  //
  // WorkspaceShell owns the activePanelId resolution (panelStore ?? prop).
  // ViewToolbar receives the already-resolved pageId via prop and uses it
  // directly — no secondary panelStore lookup.
  // ----------------------------------------------------------------

  it('uses the pageId prop as the page ID for saves', async () => {
    const savedState = {
      filters: null,
      sort: [],
      columns: [],
      pagination: { page: 1, pageSize: 25 },
      scrollPosition: { x: 0, y: 0 },
    };
    useViewStore.setState({
      currentViewId: 'view-1',
      savedState,
      currentState: { ...savedState, pagination: { page: 2, pageSize: 25 } },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'view-1' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    // Pass 'resolved-page-id' as the already-resolved page ID (simulating
    // what WorkspaceShell does after reading panelStore.activePanelId).
    renderToolbar({ views: [mockView], pageId: 'resolved-page-id' });
    const saveBtn = screen.getByTestId('save-button');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string) as Record<string, unknown>;
      expect(body.pageId).toBe('resolved-page-id');
    });
  });
});

// ----------------------------------------------------------------
// ViewSelector — ConfirmDialog on delete (AC-7)
// ----------------------------------------------------------------

describe('ViewSelector', () => {
  const mockViews: View[] = [
    {
      id: 'view-1',
      name: 'My Test View',
      pageId: 'page-1',
      stateJson: {
        filters: null,
        sort: [],
        columns: [],
        pagination: { page: 1, pageSize: 25 },
        scrollPosition: { x: 0, y: 0 },
      },
      createdBy: 'user-1',
      isShared: false,
      colorDot: null,
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  function renderSelector(onDelete = vi.fn()) {
    return render(
      <ViewSelector
        currentViewId={null}
        currentUserId="user-1"
        views={mockViews}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
      { wrapper: TestProviders },
    );
  }

  it('shows ConfirmDialog when delete is clicked from the entry menu (AC-7)', async () => {
    const onDelete = vi.fn();
    renderSelector(onDelete);

    // Open the selector popover
    fireEvent.click(screen.getByRole('button', { name: /switch view/i }));

    // Open the ⋯ menu for the view entry
    await waitFor(() => {
      expect(screen.getByLabelText(/view options/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByLabelText(/view options/i));

    // Click Delete in the menu
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Delete'));

    // ConfirmDialog should appear with the description — onDelete NOT called yet.
    await waitFor(() => {
      // The description contains the view name
      expect(screen.getByText(/This cannot be undone/i)).toBeTruthy();
    });
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete when confirm button is clicked in the dialog (AC-7)', async () => {
    const onDelete = vi.fn();
    renderSelector(onDelete);

    // Open selector and trigger delete
    fireEvent.click(screen.getByRole('button', { name: /switch view/i }));
    await waitFor(() => screen.getByLabelText(/view options/i));
    fireEvent.click(screen.getByLabelText(/view options/i));
    await waitFor(() => screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Delete'));

    // Wait for the confirm dialog to appear
    await waitFor(() => screen.getByText(/This cannot be undone/i));

    // Click the "Delete view" action button
    const confirmButton = screen.getByRole('button', { name: /delete view/i });
    fireEvent.click(confirmButton);

    expect(onDelete).toHaveBeenCalledWith('view-1');
  });
});

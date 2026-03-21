/**
 * ViewToolbar component tests.
 *
 * Covers:
 * - Renders toolbar with role="toolbar"
 * - Renders view name input
 * - Save button present and disabled when view is unmodified
 * - Save button enabled and styled when view is modified
 * - Modified indicator (dot + label + Reset button) visible only when modified
 * - Reset button calls resetView
 * - Inline view name editing: blur commits, Escape reverts
 * - ViewSelector trigger renders
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { ViewToolbar } from '../ViewToolbar';
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
    const resetBtn = screen.getByRole('button', { name: /reset view/i });
    fireEvent.click(resetBtn);

    // After reset the indicator should disappear.
    expect(screen.queryByTestId('modified-indicator')).toBeNull();
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
});

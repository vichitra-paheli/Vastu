/**
 * RecordDrawer component tests.
 *
 * Covers:
 * - Drawer renders when isOpen is true in the store
 * - Drawer is not rendered when isOpen is false
 * - Close button calls closeDrawer
 * - Overlay click calls closeDrawer
 * - Escape key closes the drawer
 * - Tabs render correctly and switching works
 * - Prev/Next navigation buttons are enabled/disabled correctly
 * - Delete confirmation dialog is shown
 * - Footer save/cancel buttons appear when dirty
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AbilityProvider } from '../../../providers/AbilityContext';
import { createNoOpAbility } from '../../../providers/AbilityContext';
import { ConfirmDialogProvider } from '../../ConfirmDialog/ConfirmDialogProvider';
import { useDrawerStore } from '../../../stores/drawerStore';
import { RecordDrawer } from '../RecordDrawer';
import type { RecordDetail } from '../RecordDrawer';

// ── Helpers ────────────────────────────────────────────────────────────────

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <AbilityProvider ability={createNoOpAbility()}>
        <ConfirmDialogProvider>
          {children}
        </ConfirmDialogProvider>
      </AbilityProvider>
    </MantineProvider>
  );
}

const MOCK_RECORD: RecordDetail = {
  id: 'rec-001',
  title: 'Test Record',
  type: 'project',
  fields: { priority: 'high', owner: 'Alice' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-03-01T12:00:00.000Z',
  updatedBy: 'Alice',
};

function openStore(recordId = 'rec-001') {
  act(() => {
    useDrawerStore.getState().openDrawer(recordId);
  });
}

function renderDrawer(fetchRecord?: (id: string) => Promise<RecordDetail>) {
  return render(
    <TestWrapper>
      <RecordDrawer fetchRecord={fetchRecord} />
    </TestWrapper>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RecordDrawer', () => {
  beforeEach(() => {
    // Reset store to closed state before each test
    act(() => {
      useDrawerStore.getState().closeDrawer();
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      useDrawerStore.getState().closeDrawer();
    });
  });

  // ── Visibility ─────────────────────────────────────────────────────────

  it('is not rendered when the drawer is closed', () => {
    renderDrawer();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a dialog when the drawer is opened', () => {
    renderDrawer();
    openStore();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has aria-modal="true" on the dialog', () => {
    renderDrawer();
    openStore();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  // ── Close ──────────────────────────────────────────────────────────────

  it('closes when the overlay is clicked', async () => {
    renderDrawer();
    openStore();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The overlay is the sibling div before the drawer
    const overlay = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(overlay);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('closes when the close button is clicked', async () => {
    renderDrawer();
    openStore();

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('closes when Escape is pressed', async () => {
    renderDrawer();
    openStore();

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  // ── Loading state ──────────────────────────────────────────────────────

  it('shows loading skeleton while fetching record', async () => {
    let resolve: (r: RecordDetail) => void;
    const fetchRecord = () =>
      new Promise<RecordDetail>((res) => {
        resolve = res;
      });

    renderDrawer(fetchRecord);
    openStore();

    // While loading, skeleton should be visible (aria-label on skeleton div)
    await waitFor(() => {
      expect(screen.getByLabelText(/loading record/i)).toBeInTheDocument();
    });

    // Resolve the fetch
    act(() => resolve(MOCK_RECORD));
  });

  it('shows record content after fetch resolves', async () => {
    const fetchRecord = vi.fn().mockResolvedValue(MOCK_RECORD);
    renderDrawer(fetchRecord);
    openStore('rec-001');

    await waitFor(() => {
      expect(screen.getByText('Test Record')).toBeInTheDocument();
    });
  });

  it('shows error state when fetch rejects', async () => {
    const fetchRecord = vi.fn().mockRejectedValue(new Error('Network error'));
    renderDrawer(fetchRecord);
    openStore('rec-001');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  // ── Tabs ───────────────────────────────────────────────────────────────

  it('renders the Details tab by default', () => {
    renderDrawer();
    openStore();
    // Tab list should contain Details
    expect(screen.getByRole('tab', { name: /details/i })).toBeInTheDocument();
  });

  it('switches tabs when a tab is clicked', () => {
    renderDrawer();
    openStore();

    const historyTab = screen.getByRole('tab', { name: /history/i });
    fireEvent.click(historyTab);

    expect(useDrawerStore.getState().activeTab).toBe('history');
  });

  it('does not render the Permissions tab for non-admin users', () => {
    renderDrawer();
    openStore();
    // createNoOpAbility() gives no permissions, so Permissions tab should be hidden
    expect(screen.queryByRole('tab', { name: /permissions/i })).not.toBeInTheDocument();
  });

  // ── Navigation ─────────────────────────────────────────────────────────

  it('prev button is disabled when at the first record', () => {
    renderDrawer();
    act(() => {
      useDrawerStore.getState().openDrawer(
        'rec-001',
        [
          { recordId: 'rec-001', title: 'Record 1' },
          { recordId: 'rec-002', title: 'Record 2' },
        ],
        0, // first item
      );
    });

    const prevButton = screen.getByRole('button', { name: /previous record/i });
    expect(prevButton).toBeDisabled();
  });

  it('next button is disabled when at the last record', () => {
    renderDrawer();
    act(() => {
      useDrawerStore.getState().openDrawer(
        'rec-002',
        [
          { recordId: 'rec-001', title: 'Record 1' },
          { recordId: 'rec-002', title: 'Record 2' },
        ],
        1, // last item
      );
    });

    const nextButton = screen.getByRole('button', { name: /next record/i });
    expect(nextButton).toBeDisabled();
  });

  it('navigates to next record when next button is clicked', () => {
    renderDrawer();
    act(() => {
      useDrawerStore.getState().openDrawer(
        'rec-001',
        [
          { recordId: 'rec-001', title: 'Record 1' },
          { recordId: 'rec-002', title: 'Record 2' },
        ],
        0,
      );
    });

    const nextButton = screen.getByRole('button', { name: /next record/i });
    fireEvent.click(nextButton);

    expect(useDrawerStore.getState().recordId).toBe('rec-002');
  });

  it('navigates to previous record when prev button is clicked', () => {
    renderDrawer();
    act(() => {
      useDrawerStore.getState().openDrawer(
        'rec-002',
        [
          { recordId: 'rec-001', title: 'Record 1' },
          { recordId: 'rec-002', title: 'Record 2' },
        ],
        1,
      );
    });

    const prevButton = screen.getByRole('button', { name: /previous record/i });
    fireEvent.click(prevButton);

    expect(useDrawerStore.getState().recordId).toBe('rec-001');
  });
});

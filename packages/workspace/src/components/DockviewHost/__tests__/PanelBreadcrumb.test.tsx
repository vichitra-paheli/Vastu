/**
 * PanelBreadcrumb component tests.
 *
 * Tests breadcrumb navigation behavior:
 * - Renders back link with source page name
 * - Clicking back focuses source panel and closes current panel
 * - Keyboard navigation (Enter key)
 *
 * Implements US-209e (VASTU-2A-209).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { PanelBreadcrumb } from '../PanelBreadcrumb';
import { usePanelStore } from '../../../stores/panelStore';

// Mock usePanelStore
const mockFocusPanel = vi.fn();
const mockClosePanel = vi.fn();

vi.mock('../../../stores/panelStore', () => ({
  usePanelStore: vi.fn(),
}));

const mockUsePanelStore = vi.mocked(usePanelStore);

function setupPanelStore(openPanelIds: string[] = ['dashboard']) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock for Zustand selector
  mockUsePanelStore.mockImplementation((selector: any) => {
    const state = {
      focusPanel: mockFocusPanel,
      closePanel: mockClosePanel,
      openPanelIds,
    };
    return selector(state);
  });
}

function renderBreadcrumb(
  panelId = 'driver-profile-panel',
  sourcePageId = 'dashboard',
  sourcePageName = 'Dashboard',
) {
  return render(
    <TestProviders>
      <PanelBreadcrumb
        panelId={panelId}
        sourcePageId={sourcePageId}
        sourcePageName={sourcePageName}
      />
    </TestProviders>,
  );
}

describe('PanelBreadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPanelStore(['dashboard']);
  });

  it('renders a back link with the source page name', () => {
    renderBreadcrumb();

    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveTextContent('Back to Dashboard');
  });

  it('has accessible aria-label on the back button', () => {
    renderBreadcrumb('panel-1', 'f1-races', 'Races');

    const backButton = screen.getByRole('button');
    expect(backButton).toHaveAttribute('aria-label');
    expect(backButton.getAttribute('aria-label')).toContain('Races');
  });

  it('has navigation landmark for accessibility', () => {
    renderBreadcrumb();

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  describe('back navigation', () => {
    it('focuses the source panel when source is open', () => {
      setupPanelStore(['dashboard', 'driver-profile-panel']);
      renderBreadcrumb('driver-profile-panel', 'dashboard', 'Dashboard');

      fireEvent.click(screen.getByRole('button'));

      expect(mockFocusPanel).toHaveBeenCalledWith('dashboard');
    });

    it('closes the current panel after clicking back', () => {
      setupPanelStore(['dashboard', 'driver-profile-panel']);
      renderBreadcrumb('driver-profile-panel', 'dashboard', 'Dashboard');

      fireEvent.click(screen.getByRole('button'));

      expect(mockClosePanel).toHaveBeenCalledWith('driver-profile-panel');
    });

    it('only closes current panel when source is not open', () => {
      // Source panel is NOT in openPanelIds
      setupPanelStore(['driver-profile-panel']);
      renderBreadcrumb('driver-profile-panel', 'dashboard', 'Dashboard');

      fireEvent.click(screen.getByRole('button'));

      // Does not focus (source not open), but still closes current panel
      expect(mockFocusPanel).not.toHaveBeenCalled();
      expect(mockClosePanel).toHaveBeenCalledWith('driver-profile-panel');
    });

    it('triggers back navigation on Enter key', () => {
      setupPanelStore(['dashboard', 'driver-profile-panel']);
      renderBreadcrumb('driver-profile-panel', 'dashboard', 'Dashboard');

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

      expect(mockFocusPanel).toHaveBeenCalledWith('dashboard');
      expect(mockClosePanel).toHaveBeenCalledWith('driver-profile-panel');
    });

    it('triggers back navigation on Space key', () => {
      setupPanelStore(['dashboard', 'driver-profile-panel']);
      renderBreadcrumb('driver-profile-panel', 'dashboard', 'Dashboard');

      fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });

      expect(mockFocusPanel).toHaveBeenCalledWith('dashboard');
      expect(mockClosePanel).toHaveBeenCalledWith('driver-profile-panel');
    });

    it('does not trigger back navigation on other keys', () => {
      setupPanelStore(['dashboard', 'driver-profile-panel']);
      renderBreadcrumb();

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' });
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });

      expect(mockFocusPanel).not.toHaveBeenCalled();
      expect(mockClosePanel).not.toHaveBeenCalled();
    });
  });
});

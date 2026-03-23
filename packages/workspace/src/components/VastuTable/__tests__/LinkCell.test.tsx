/**
 * LinkCell component tests.
 *
 * Tests cross-page navigation cell renderer behavior:
 * - Renders clickable link for valid navigateTo config
 * - Left-click triggers navigateToPage with correct intent
 * - ⌘/Ctrl+Click forces new panel
 * - Null/undefined value renders as plain text (disabled)
 * - Non-registered pageId shows "Page not configured" tooltip
 * - Enter key triggers navigation
 *
 * Implements US-209d, US-209e (VASTU-2A-209).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { LinkCell } from '../LinkCell';
import type { NavigateTo } from '../LinkCell';

// Mock useNavigateToPage so we can spy on navigateToPage calls.
const mockNavigateToPage = vi.fn();
const mockIsPageRegistered = vi.fn();

vi.mock('../../../navigation/useNavigateToPage', () => ({
  useNavigateToPage: () => ({
    navigateToPage: mockNavigateToPage,
    isPageRegistered: mockIsPageRegistered,
  }),
}));

function renderLinkCell(
  value: unknown,
  navigateTo: NavigateTo,
  overrides?: { sourcePageId?: string; sourcePageName?: string },
) {
  return render(
    <TestProviders>
      <LinkCell
        value={value}
        navigateTo={navigateTo}
        sourcePageId={overrides?.sourcePageId}
        sourcePageName={overrides?.sourcePageName}
      />
    </TestProviders>,
  );
}

describe('LinkCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when page is registered and value is present', () => {
    const navigateTo: NavigateTo = {
      pageId: 'f1-driver-profile',
      recordId: '{value}',
    };

    beforeEach(() => {
      mockIsPageRegistered.mockReturnValue(true);
    });

    it('renders a button with the cell value as text', () => {
      renderLinkCell('Lewis Hamilton', navigateTo);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Lewis Hamilton');
    });

    it('calls navigateToPage with resolved recordId on left-click', () => {
      renderLinkCell('driver-42', navigateTo);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(mockNavigateToPage).toHaveBeenCalledTimes(1);
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        {
          targetPageId: 'f1-driver-profile',
          recordId: 'driver-42',
          sourcePageId: undefined,
          sourcePageName: undefined,
        },
        false,
      );
    });

    it('calls navigateToPage with forceNewPanel=true on Ctrl+Click', () => {
      renderLinkCell('driver-42', navigateTo);
      const button = screen.getByRole('button');

      fireEvent.click(button, { ctrlKey: true });

      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.objectContaining({ recordId: 'driver-42' }),
        true,
      );
    });

    it('calls navigateToPage with forceNewPanel=true on Meta+Click (⌘+Click)', () => {
      renderLinkCell('driver-42', navigateTo);
      const button = screen.getByRole('button');

      fireEvent.click(button, { metaKey: true });

      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.objectContaining({ recordId: 'driver-42' }),
        true,
      );
    });

    it('calls navigateToPage on Enter key press', () => {
      renderLinkCell('driver-42', navigateTo);
      const button = screen.getByRole('button');

      fireEvent.keyDown(button, { key: 'Enter' });

      expect(mockNavigateToPage).toHaveBeenCalledTimes(1);
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.objectContaining({ recordId: 'driver-42' }),
        false,
      );
    });

    it('does not trigger navigation on other key presses', () => {
      renderLinkCell('driver-42', navigateTo);
      const button = screen.getByRole('button');

      fireEvent.keyDown(button, { key: 'Space' });
      fireEvent.keyDown(button, { key: 'Tab' });
      fireEvent.keyDown(button, { key: 'ArrowDown' });

      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });

    it('replaces {value} placeholder in recordId template', () => {
      const navWithTemplate: NavigateTo = {
        pageId: 'f1-driver-profile',
        recordId: 'driver-{value}',
      };

      renderLinkCell('99', navWithTemplate);
      fireEvent.click(screen.getByRole('button'));

      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.objectContaining({ recordId: 'driver-99' }),
        false,
      );
    });

    it('passes sourcePageId and sourcePageName to the intent', () => {
      renderLinkCell('driver-42', navigateTo, {
        sourcePageId: 'f1-races',
        sourcePageName: 'Races',
      });

      fireEvent.click(screen.getByRole('button'));

      expect(mockNavigateToPage).toHaveBeenCalledWith(
        {
          targetPageId: 'f1-driver-profile',
          recordId: 'driver-42',
          sourcePageId: 'f1-races',
          sourcePageName: 'Races',
        },
        false,
      );
    });
  });

  describe('when cell value is null or undefined', () => {
    beforeEach(() => {
      mockIsPageRegistered.mockReturnValue(true);
    });

    it('renders plain text (no button) for null value', () => {
      renderLinkCell(null, { pageId: 'f1-driver-profile', recordId: '{value}' });

      // No button rendered
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders plain text (no button) for undefined value', () => {
      renderLinkCell(undefined, { pageId: 'f1-driver-profile', recordId: '{value}' });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders plain text (no button) for empty string value', () => {
      renderLinkCell('', { pageId: 'f1-driver-profile', recordId: '{value}' });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('when page is not registered', () => {
    beforeEach(() => {
      mockIsPageRegistered.mockReturnValue(false);
    });

    it('renders the value as a disabled (non-clickable) span', () => {
      renderLinkCell('Hamilton', { pageId: 'nonexistent-page', recordId: '{value}' });

      // No navigable button
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      // Text still rendered
      expect(screen.getByText('Hamilton')).toBeInTheDocument();
    });

    it('does not call navigateToPage when clicked', () => {
      renderLinkCell('Hamilton', { pageId: 'nonexistent-page', recordId: '{value}' });
      // Clicking the text area should not trigger navigation
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  describe('aria attributes', () => {
    beforeEach(() => {
      mockIsPageRegistered.mockReturnValue(true);
    });

    it('button has aria-label with value and page info', () => {
      renderLinkCell('Max Verstappen', {
        pageId: 'f1-driver-profile',
        recordId: '{value}',
      });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      // aria-label should contain the value
      expect(button.getAttribute('aria-label')).toContain('Max Verstappen');
    });

    it('button has data attributes for navigation target', () => {
      renderLinkCell('driver-1', { pageId: 'f1-driver-profile', recordId: '{value}' });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-navigate-to', 'f1-driver-profile');
      expect(button).toHaveAttribute('data-record-id', 'driver-1');
    });
  });
});

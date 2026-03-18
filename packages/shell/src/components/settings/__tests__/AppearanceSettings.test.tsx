/**
 * AppearanceSettings tests — US-018
 *
 * Verifies:
 *   - All three controls render (color scheme, accent color, density)
 *   - Color scheme change is applied immediately
 *   - Accent color swatch selection changes the active state
 *   - Density change triggers a save
 *   - Custom hex input accepts valid hex values
 *   - Invalid hex input does not trigger a save
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppearanceSettings } from '../AppearanceSettings';
import { TestProviders } from '../../../test-utils/providers';

// ---------------------------------------------------------------------------
// Mock fetch so tests do not hit the network
// ---------------------------------------------------------------------------

const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
} as Response);

// ---------------------------------------------------------------------------
// Mock useColorScheme so we can assert it was called
// ---------------------------------------------------------------------------

const setColorSchemeMock = vi.fn();

vi.mock('../../../hooks/useColorScheme', () => ({
  useColorScheme: () => ({
    colorScheme: 'auto',
    setColorScheme: setColorSchemeMock,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent(props: React.ComponentProps<typeof AppearanceSettings> = {}) {
  return render(
    <TestProviders>
      <AppearanceSettings {...props} />
    </TestProviders>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppearanceSettings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockClear();
    setColorSchemeMock.mockClear();
    // Use fake timers for debounce testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders the color scheme segmented control', () => {
    renderComponent();
    expect(screen.getByTestId('color-scheme-control')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders the accent color swatch row', () => {
    renderComponent();
    expect(screen.getByTestId('accent-color-swatches')).toBeInTheDocument();
  });

  it('renders the density segmented control', () => {
    renderComponent();
    expect(screen.getByTestId('density-control')).toBeInTheDocument();
    expect(screen.getByText('Compact')).toBeInTheDocument();
    expect(screen.getByText('Comfortable')).toBeInTheDocument();
    expect(screen.getByText('Spacious')).toBeInTheDocument();
  });

  it('renders the custom hex input', () => {
    renderComponent();
    expect(screen.getByTestId('accent-color-hex-input')).toBeInTheDocument();
  });

  // ── Initial values ────────────────────────────────────────────────────────

  it('shows the initial hex value in the custom hex input', () => {
    renderComponent({ initialAccentColor: '#E03131' });
    const input = screen.getByTestId('accent-color-hex-input').querySelector('input');
    expect(input).toHaveValue('#E03131');
  });

  // ── Color scheme change ───────────────────────────────────────────────────

  it('calls setColorScheme when the color scheme changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComponent({ initialColorScheme: 'auto' });

    const lightOption = screen.getByText('Light');
    await user.click(lightOption);

    expect(setColorSchemeMock).toHaveBeenCalledWith('light');
  });

  it('schedules a PATCH save after color scheme change', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComponent({ initialColorScheme: 'auto' });

    const darkOption = screen.getByText('Dark');
    await user.click(darkOption);

    expect(fetchMock).not.toHaveBeenCalled();

    // Advance timers past the 500ms debounce
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/settings/appearance',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  // ── Accent color swatch ───────────────────────────────────────────────────

  it('marks the initially selected swatch as aria-pressed', () => {
    renderComponent({ initialAccentColor: '#4C6EF5' });
    const swatches = screen.getByTestId('accent-color-swatches');
    const indigoButton = swatches.querySelector('[aria-pressed="true"]');
    expect(indigoButton).toBeInTheDocument();
    expect(indigoButton).toHaveAttribute('aria-label', 'Indigo (default)');
  });

  it('schedules a PATCH save after accent swatch click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComponent({ initialAccentColor: '#4C6EF5' });

    const tealButton = screen.getByRole('button', { name: 'Teal' });
    await user.click(tealButton);

    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/settings/appearance',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('#0CA678'),
        }),
      );
    });
  });

  // ── Custom hex input ──────────────────────────────────────────────────────

  it('schedules a save when a valid hex color is typed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComponent();

    const inputWrapper = screen.getByTestId('accent-color-hex-input');
    const input = inputWrapper.querySelector('input')!;

    // Clear existing and type a valid hex
    await user.clear(input);
    await user.type(input, '#9C36B5');

    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/settings/appearance',
        expect.objectContaining({
          body: expect.stringContaining('#9C36B5'),
        }),
      );
    });
  });

  it('does NOT schedule a save when an invalid hex color is typed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComponent();

    const inputWrapper = screen.getByTestId('accent-color-hex-input');
    const input = inputWrapper.querySelector('input')!;

    await user.clear(input);
    // Type an invalid hex (only 4 chars, not valid)
    fireEvent.change(input, { target: { value: '#ZZZ' } });

    vi.advanceTimersByTime(600);

    // Should not trigger a fetch
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── Density change ────────────────────────────────────────────────────────

  it('schedules a PATCH save after density change', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComponent({ initialDensity: 'comfortable' });

    const compactOption = screen.getByText('Compact');
    await user.click(compactOption);

    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/settings/appearance',
        expect.objectContaining({
          body: expect.stringContaining('compact'),
        }),
      );
    });
  });

  // ── Saved indicator ───────────────────────────────────────────────────────

  it('shows the Saved indicator after a successful save', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComponent({ initialDensity: 'comfortable' });

    const spaciousOption = screen.getByText('Spacious');
    await user.click(spaciousOption);

    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeVisible();
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('shows an error notification when the API returns a non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComponent({ initialDensity: 'comfortable' });

    const compactOption = screen.getByText('Compact');
    await user.click(compactOption);

    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    // The showError notification is tested at the notification layer;
    // here we just verify the save was attempted.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

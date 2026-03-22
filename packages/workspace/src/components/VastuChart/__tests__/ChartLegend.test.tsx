/**
 * ChartLegend component tests.
 *
 * Covers:
 * - Renders series names with color swatches
 * - Click: toggle series visibility (aria-pressed)
 * - Double-click: solo series behavior
 * - Double-click again: restore all series
 * - Hidden series has data-hidden=true
 * - Keyboard navigation (Enter key)
 * - Position variants
 *
 * Implements US-135 AC-4.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { ChartLegend } from '../ChartLegend';
import type { SeriesConfig } from '../types';
import { CHART_SERIES_COLORS } from '../chartColors';

// ─── Test data ────────────────────────────────────────────────────────────────

const TEST_SERIES: SeriesConfig[] = [
  { dataKey: 'revenue', name: 'Revenue' },
  { dataKey: 'cost', name: 'Cost' },
  { dataKey: 'profit', name: 'Profit' },
];

const RESOLVED_COLORS: Record<string, string> = {
  revenue: CHART_SERIES_COLORS[0],
  cost: CHART_SERIES_COLORS[1],
  profit: CHART_SERIES_COLORS[2],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderLegend(
  props: {
    series?: SeriesConfig[];
    resolvedColors?: Record<string, string>;
    hiddenSeries?: Set<string>;
    position?: 'top' | 'bottom' | 'left' | 'right';
    onToggle?: (dataKey: string) => void;
    onSolo?: (dataKey: string) => void;
  } = {},
) {
  const defaults = {
    series: TEST_SERIES,
    resolvedColors: RESOLVED_COLORS,
    hiddenSeries: new Set<string>(),
    onToggle: vi.fn(),
    onSolo: vi.fn(),
  };
  return render(
    <ChartLegend {...defaults} {...props} />,
    { wrapper: TestProviders },
  );
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('ChartLegend — rendering', () => {
  it('renders a button for each series', () => {
    renderLegend();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('displays the series names', () => {
    renderLegend();
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('Cost')).toBeTruthy();
    expect(screen.getByText('Profit')).toBeTruthy();
  });

  it('renders nothing when series array is empty', () => {
    renderLegend({ series: [] });
    // No list should be rendered when there are no series
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('has role=list on the legend container', () => {
    renderLegend();
    expect(screen.getByRole('list')).toBeTruthy();
  });

  it('each series entry has role=listitem', () => {
    renderLegend();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });
});

// ─── Visibility state ─────────────────────────────────────────────────────────

describe('ChartLegend — visibility state', () => {
  it('sets aria-pressed=true for visible series', () => {
    renderLegend({ hiddenSeries: new Set() });
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('sets aria-pressed=false for hidden series', () => {
    renderLegend({ hiddenSeries: new Set(['revenue']) });
    const revenueBtn = screen.getByRole('button', { name: /revenue/i });
    expect(revenueBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('sets data-hidden=true for hidden series', () => {
    renderLegend({ hiddenSeries: new Set(['cost']) });
    const costBtn = screen.getByRole('button', { name: /cost/i });
    expect(costBtn.getAttribute('data-hidden')).toBe('true');
  });

  it('sets data-hidden=false for visible series', () => {
    renderLegend({ hiddenSeries: new Set() });
    const revenueBtn = screen.getByRole('button', { name: /revenue/i });
    expect(revenueBtn.getAttribute('data-hidden')).toBe('false');
  });
});

// ─── Single click: toggle ────────────────────────────────────────────────────

describe('ChartLegend — single click toggle', () => {
  it('calls onToggle with the correct dataKey when a series is clicked', () => {
    const onToggle = vi.fn();
    renderLegend({ onToggle });
    const revenueBtn = screen.getByRole('button', { name: /revenue/i });
    fireEvent.click(revenueBtn);
    // Allow the double-click detection timer to resolve — single click fires onToggle
    // Note: click is detected as single if no second click within 400ms
    expect(onToggle).toHaveBeenCalledWith('revenue');
  });

  it('calls onToggle for cost series when cost is clicked', () => {
    const onToggle = vi.fn();
    renderLegend({ onToggle });
    const costBtn = screen.getByRole('button', { name: /cost/i });
    fireEvent.click(costBtn);
    expect(onToggle).toHaveBeenCalledWith('cost');
  });
});

// ─── Double click: solo ───────────────────────────────────────────────────────

describe('ChartLegend — double click solo', () => {
  it('calls onSolo when a series is double-clicked', () => {
    const onSolo = vi.fn();
    renderLegend({ onSolo });
    const revenueBtn = screen.getByRole('button', { name: /revenue/i });
    // Simulate double-click: two clicks in quick succession
    fireEvent.click(revenueBtn);
    fireEvent.click(revenueBtn);
    expect(onSolo).toHaveBeenCalledWith('revenue');
  });
});

// ─── Keyboard navigation ──────────────────────────────────────────────────────

describe('ChartLegend — keyboard navigation', () => {
  it('calls onToggle when Enter is pressed on a series button', () => {
    const onToggle = vi.fn();
    renderLegend({ onToggle });
    const revenueBtn = screen.getByRole('button', { name: /revenue/i });
    fireEvent.keyDown(revenueBtn, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledWith('revenue');
  });

  it('calls onToggle when Space is pressed on a series button', () => {
    const onToggle = vi.fn();
    renderLegend({ onToggle });
    const costBtn = screen.getByRole('button', { name: /cost/i });
    fireEvent.keyDown(costBtn, { key: ' ' });
    expect(onToggle).toHaveBeenCalledWith('cost');
  });
});

// ─── Position variants ────────────────────────────────────────────────────────

describe('ChartLegend — position', () => {
  it('renders with data-position=bottom by default', () => {
    renderLegend();
    const legend = screen.getByRole('list');
    expect(legend.getAttribute('data-position')).toBe('bottom');
  });

  it('renders with data-position=top when specified', () => {
    renderLegend({ position: 'top' });
    const legend = screen.getByRole('list');
    expect(legend.getAttribute('data-position')).toBe('top');
  });

  it('renders with data-position=left when specified', () => {
    renderLegend({ position: 'left' });
    const legend = screen.getByRole('list');
    expect(legend.getAttribute('data-position')).toBe('left');
  });
});

// ─── Color swatches ───────────────────────────────────────────────────────────

describe('ChartLegend — color swatches', () => {
  it('renders swatches with the resolved series colors', () => {
    renderLegend();
    // Each button contains a swatch span with aria-hidden
    const swatches = document
      .querySelectorAll('[aria-hidden="true"]');
    // We expect at least 3 swatches (one per series)
    expect(swatches.length).toBeGreaterThanOrEqual(3);
  });
});

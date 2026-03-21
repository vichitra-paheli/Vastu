/**
 * FilterBar component tests.
 *
 * Covers:
 * - Renders empty state when no filters
 * - Renders pills for active filters
 * - "Filters active (N)" indicator
 * - + Add filter and Advanced toggle
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { FilterBar } from '../FilterBar';
import type { FilterState, FilterDimension } from '../types';

const dimensions: FilterDimension[] = [
  { column: 'name', label: 'Name', dataType: 'text' },
  { column: 'status', label: 'Status', dataType: 'enum', enumOptions: [{ value: 'Shipped' }, { value: 'Pending' }] },
  { column: 'amount', label: 'Amount', dataType: 'number', numberMin: 0, numberMax: 10000 },
];

const emptyState: FilterState = { root: null, advanced: false };

const stateWithFilters: FilterState = {
  root: {
    type: 'group',
    connector: 'AND',
    children: [
      { type: 'condition', column: 'status', dataType: 'enum', mode: 'include', value: ['Shipped', 'Pending'] },
      { type: 'condition', column: 'name', dataType: 'text', mode: 'exclude', value: ['test'] },
    ],
  },
  advanced: false,
};

function renderBar(state: FilterState, onChange = vi.fn()) {
  return render(
    <FilterBar filterState={state} dimensions={dimensions} onChange={onChange} />,
    { wrapper: TestProviders },
  );
}

describe('FilterBar', () => {
  it('renders empty state label when no filters are applied', () => {
    renderBar(emptyState);
    expect(screen.getByText('No filters applied')).toBeTruthy();
  });

  it('renders + Add filter button', () => {
    renderBar(emptyState);
    expect(screen.getByText('+ Add filter')).toBeTruthy();
  });

  it('renders Advanced toggle button', () => {
    renderBar(emptyState);
    expect(screen.getByText('Advanced')).toBeTruthy();
  });

  it('shows "Filters active (N)" indicator when filters are applied', () => {
    renderBar(stateWithFilters);
    expect(screen.getByText('Filters active (2)')).toBeTruthy();
  });

  it('renders a pill for each top-level condition', () => {
    renderBar(stateWithFilters);
    // Both conditions should render as pills with their column labels
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('does not show empty state when filters are applied', () => {
    renderBar(stateWithFilters);
    expect(screen.queryByText('No filters applied')).toBeNull();
  });

  it('calls onChange with cleared state when Clear all is clicked', () => {
    const onChange = vi.fn();
    renderBar(stateWithFilters, onChange);
    fireEvent.click(screen.getByText('Clear all filters'));
    expect(onChange).toHaveBeenCalledWith({ root: null, advanced: false });
  });

  it('calls onChange with advanced=true when Advanced is clicked', () => {
    const onChange = vi.fn();
    renderBar(emptyState, onChange);
    fireEvent.click(screen.getByText('Advanced'));
    expect(onChange).toHaveBeenCalledWith({ ...emptyState, advanced: true });
  });

  it('shows Simple toggle and builder title in advanced mode', () => {
    const advancedState: FilterState = { ...emptyState, advanced: true };
    renderBar(advancedState);
    expect(screen.getByText('Simple')).toBeTruthy();
    expect(screen.getByText('Advanced filters')).toBeTruthy();
  });
});

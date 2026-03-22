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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { FilterBar } from '../FilterBar';
import type { FilterState, FilterDimension } from '../types';
import { createCondition, createRootGroup } from '../types';
import { useViewFilterStore } from '../../../stores/viewFilterStore';

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

function renderBar(state: FilterState, onChange = vi.fn(), viewId?: string) {
  return render(
    <FilterBar filterState={state} dimensions={dimensions} onChange={onChange} viewId={viewId} />,
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

describe('FilterBar — mode propagation (AC-2 from US-122)', () => {
  const VIEW_ID = 'test-view-mode';

  beforeEach(() => {
    // Reset viewFilterStore before each test
    useViewFilterStore.setState({ filtersByView: {}, modeByView: {} });
  });

  it('createCondition defaults to include mode', () => {
    const condition = createCondition('name', 'text');
    expect(condition.mode).toBe('include');
    expect(condition.column).toBe('name');
    expect(condition.type).toBe('condition');
  });

  it('createCondition respects explicit exclude mode', () => {
    const condition = createCondition('status', 'enum', 'exclude');
    expect(condition.mode).toBe('exclude');
    expect(condition.column).toBe('status');
    expect(condition.type).toBe('condition');
  });

  it('createCondition respects regex mode for text columns', () => {
    const condition = createCondition('name', 'text', 'regex');
    expect(condition.mode).toBe('regex');
    // Regex value should be empty string (not array)
    expect(condition.value).toBe('');
  });

  it('FilterBar renders with viewId prop without crashing', () => {
    // Set the active mode for this view to 'exclude'
    useViewFilterStore.getState().setMode(VIEW_ID, 'exclude');
    const onChange = vi.fn();
    // Should render without error when viewId is provided
    renderBar(emptyState, onChange, VIEW_ID);
    expect(screen.getByText('No filters applied')).toBeTruthy();
  });

  it('viewFilterStore getMode returns exclude after setMode', () => {
    useViewFilterStore.getState().setMode(VIEW_ID, 'exclude');
    expect(useViewFilterStore.getState().getMode(VIEW_ID)).toBe('exclude');
  });

  it('viewFilterStore getMode defaults to include for unknown view', () => {
    expect(useViewFilterStore.getState().getMode('nonexistent-view')).toBe('include');
  });

  it('FilterNode round-trip: condition serializes with column (not field)', () => {
    const condition = createCondition('status', 'enum', 'include');
    const json = JSON.stringify(condition);
    const parsed = JSON.parse(json) as ReturnType<typeof createCondition>;

    expect(parsed.type).toBe('condition');
    expect(parsed.column).toBe('status');
    expect(Object.prototype.hasOwnProperty.call(parsed, 'field')).toBe(false);
    expect(parsed.mode).toBe('include');
  });

  it('FilterNode round-trip: group serializes with connector (not operator)', () => {
    const group = {
      ...createRootGroup(),
      children: [createCondition('name', 'text', 'include')],
    };
    const json = JSON.stringify(group);
    const parsed = JSON.parse(json) as typeof group;

    expect(parsed.type).toBe('group');
    expect(parsed.connector).toBe('AND');
    expect(Object.prototype.hasOwnProperty.call(parsed, 'operator')).toBe(false);
  });
});

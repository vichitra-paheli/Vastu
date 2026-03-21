/**
 * FilterPill component tests.
 *
 * Covers:
 * - Renders column name and value summary
 * - Mode indicator shows correct class/color
 * - Remove button fires onRemove
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { FilterPill } from '../FilterPill';
import type { FilterCondition, FilterDimension } from '../types';

const dimension: FilterDimension = {
  column: 'status',
  label: 'Status',
  dataType: 'enum',
  enumOptions: [{ value: 'Shipped' }, { value: 'Pending' }],
};

function makeCondition(
  mode: FilterCondition['mode'],
  value: FilterCondition['value'],
): FilterCondition {
  return { type: 'condition', column: 'status', dataType: 'enum', mode, value };
}

function renderPill(
  condition: FilterCondition,
  onRemove = vi.fn(),
  onChange = vi.fn(),
) {
  return render(
    <FilterPill
      condition={condition}
      dimension={dimension}
      onRemove={onRemove}
      onChange={onChange}
    />,
    { wrapper: TestProviders },
  );
}

describe('FilterPill', () => {
  it('renders the column label', () => {
    renderPill(makeCondition('include', ['Shipped']));
    expect(screen.getByText('Status')).toBeTruthy();
  });

  it('renders include mode short label "I"', () => {
    renderPill(makeCondition('include', ['Shipped']));
    expect(screen.getByText('I')).toBeTruthy();
  });

  it('renders exclude mode short label "E"', () => {
    renderPill(makeCondition('exclude', ['Shipped']));
    expect(screen.getByText('E')).toBeTruthy();
  });

  it('renders regex mode short label "R"', () => {
    renderPill(makeCondition('regex', '^Ship'), );
    expect(screen.getByText('R')).toBeTruthy();
  });

  it('renders value summary for multiple enum values', () => {
    renderPill(makeCondition('include', ['Shipped', 'Pending']));
    // "Shipped, +1" summary
    expect(screen.getByText('Shipped, +1')).toBeTruthy();
  });

  it('renders single value summary', () => {
    renderPill(makeCondition('include', ['Shipped']));
    expect(screen.getByText('Shipped')).toBeTruthy();
  });

  it('calls onRemove when × is clicked', () => {
    const onRemove = vi.fn();
    renderPill(makeCondition('include', ['Shipped']), onRemove);
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('renders regex value summary with slashes', () => {
    renderPill(makeCondition('regex', '^Ship'));
    expect(screen.getByText('/^Ship/')).toBeTruthy();
  });

  it('renders dash for empty value', () => {
    renderPill(makeCondition('include', []));
    expect(screen.getByText('—')).toBeTruthy();
  });
});

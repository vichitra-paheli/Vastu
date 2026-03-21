/**
 * DimensionPicker component tests.
 *
 * Covers:
 * - Lists available columns when opened
 * - Groups by data type
 * - Search filters the list
 * - Clicking a dimension calls onSelect
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { DimensionPicker } from '../DimensionPicker';
import type { FilterDimension } from '../types';

const dimensions: FilterDimension[] = [
  { column: 'name', label: 'Name', dataType: 'text' },
  { column: 'status', label: 'Status', dataType: 'enum' },
  { column: 'amount', label: 'Amount', dataType: 'number' },
  { column: 'created_at', label: 'Created At', dataType: 'date' },
  { column: 'active', label: 'Active', dataType: 'boolean' },
];

function renderPicker(onSelect = vi.fn()) {
  return render(
    <DimensionPicker dimensions={dimensions} onSelect={onSelect}>
      <button type="button">Open picker</button>
    </DimensionPicker>,
    { wrapper: TestProviders },
  );
}

describe('DimensionPicker', () => {
  it('renders the trigger child', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Open picker' })).toBeTruthy();
  });

  it('shows dimension list when opened', async () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Open picker' }));
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeTruthy();
      expect(screen.getByText('Status')).toBeTruthy();
      expect(screen.getByText('Amount')).toBeTruthy();
    });
  });

  it('shows group headers for each data type', async () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Open picker' }));
    await waitFor(() => {
      expect(screen.getByText('Text')).toBeTruthy();
      expect(screen.getByText('Enum')).toBeTruthy();
      expect(screen.getByText('Number')).toBeTruthy();
    });
  });

  it('filters by search input', async () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Open picker' }));
    await waitFor(() => screen.getByPlaceholderText('Search columns...'));

    const searchInput = screen.getByPlaceholderText('Search columns...');
    fireEvent.change(searchInput, { target: { value: 'amo' } });

    await waitFor(() => {
      expect(screen.getByText('Amount')).toBeTruthy();
      expect(screen.queryByText('Name')).toBeNull();
    });
  });

  it('calls onSelect with column key when a dimension is clicked', async () => {
    const onSelect = vi.fn();
    renderPicker(onSelect);
    fireEvent.click(screen.getByRole('button', { name: 'Open picker' }));
    await waitFor(() => screen.getByText('Status'));

    fireEvent.click(screen.getByText('Status'));
    expect(onSelect).toHaveBeenCalledWith('status');
  });

  it('closes after selecting a dimension', async () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Open picker' }));
    await waitFor(() => screen.getByText('Name'));

    fireEvent.click(screen.getByText('Name'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search columns...')).toBeNull();
    });
  });
});

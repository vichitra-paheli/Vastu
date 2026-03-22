/**
 * EmptyState component tests.
 *
 * Covers:
 * - Renders icon, message
 * - Optional action button renders and fires callback
 * - No action button when actionLabel/onAction not provided
 * - Has role="status" for accessibility
 * - Centers in its container (className applied)
 * - Additional className prop is forwarded
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IconTable, IconSearch } from '@tabler/icons-react';
import { TestProviders } from '../../../test-utils/providers';
import { EmptyState } from '../EmptyState';

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

describe('EmptyState', () => {
  it('renders the message text', () => {
    renderWithProviders(
      <EmptyState
        icon={<IconTable />}
        message="No rows to display."
      />,
    );
    expect(screen.getByText('No rows to display.')).toBeInTheDocument();
  });

  it('renders with role="status"', () => {
    renderWithProviders(
      <EmptyState icon={<IconTable />} message="Nothing here." />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not render an action button when actionLabel is not provided', () => {
    renderWithProviders(
      <EmptyState icon={<IconTable />} message="No data." />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the action button with the given label', () => {
    renderWithProviders(
      <EmptyState
        icon={<IconSearch />}
        message="No results found."
        actionLabel="Reset filters"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
  });

  it('calls onAction when the action button is clicked', () => {
    const onAction = vi.fn();
    renderWithProviders(
      <EmptyState
        icon={<IconSearch />}
        message="No results found."
        actionLabel="Reset filters"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('does not render an action button when only actionLabel is provided (no onAction)', () => {
    renderWithProviders(
      <EmptyState
        icon={<IconTable />}
        message="No data."
        actionLabel="Do something"
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('forwards an additional className to the root element', () => {
    renderWithProviders(
      <EmptyState
        icon={<IconTable />}
        message="Empty."
        className="custom-class"
      />,
    );
    // EmptyState renders with role="status"; the className is applied to that element
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });

  it('icon wrapper is aria-hidden', () => {
    const { container } = renderWithProviders(
      <EmptyState icon={<IconTable />} message="Empty." />,
    );
    // Icon wrapper is aria-hidden
    const iconWrapper = container.querySelector('[aria-hidden="true"]');
    expect(iconWrapper).toBeInTheDocument();
  });
});

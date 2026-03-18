/**
 * EmptyState tests — Patterns Library §8
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IconTable } from '@tabler/icons-react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../EmptyState';
import { TestProviders } from '../../../test-utils/providers';

function renderComponent(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

describe('EmptyState', () => {
  it('renders the message', () => {
    renderComponent(
      <EmptyState
        icon={IconTable}
        message="No orders found. Create your first order or import from CSV."
      />,
    );
    expect(
      screen.getByText('No orders found. Create your first order or import from CSV.'),
    ).toBeInTheDocument();
  });

  it('renders an action button when actionLabel is provided', () => {
    const onAction = vi.fn();
    renderComponent(
      <EmptyState
        icon={IconTable}
        message="No data."
        actionLabel="Create order"
        onAction={onAction}
      />,
    );
    expect(screen.getByRole('button', { name: 'Create order' })).toBeInTheDocument();
  });

  it('does not render an action button when actionLabel is not provided', () => {
    renderComponent(
      <EmptyState icon={IconTable} message="No data." />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render an action button when onAction is not provided', () => {
    renderComponent(
      <EmptyState icon={IconTable} message="No data." actionLabel="Create" />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('fires onAction callback when the action button is clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    renderComponent(
      <EmptyState
        icon={IconTable}
        message="No data."
        actionLabel="Create order"
        onAction={onAction}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create order' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders the icon element (aria-hidden)', () => {
    renderComponent(
      <EmptyState icon={IconTable} message="No data." />,
    );
    // The icon SVG should be present; aria-hidden hides it from the a11y tree
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});

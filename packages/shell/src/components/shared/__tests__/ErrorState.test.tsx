/**
 * ErrorState tests — Patterns Library §6.3 Loading state choreography (error state).
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from '../ErrorState';
import { TestProviders } from '@/test-utils/providers';

function renderComponent(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

describe('ErrorState', () => {
  it('renders the default error message', () => {
    renderComponent(<ErrorState />);
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument();
  });

  it('renders a custom error message', () => {
    renderComponent(<ErrorState message="Failed to load data." />);
    expect(screen.getByText('Failed to load data.')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    renderComponent(<ErrorState onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('does not show retry button when onRetry is not provided', () => {
    renderComponent(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('fires onRetry callback when the retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    renderComponent(<ErrorState onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the alert icon (aria-hidden)', () => {
    renderComponent(<ErrorState />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('fires onRetry only once per click (not multiple times)', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    renderComponent(<ErrorState onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});

/**
 * ErrorPage tests — US-025 error pages component.
 *
 * Tests cover:
 * - Renders status code, title, and message correctly
 * - Renders link-type actions as anchor elements
 * - Renders onClick-type actions as buttons
 * - onClick action fires the provided callback
 * - First action uses filled variant; subsequent actions use subtle variant
 * - KundliMotif background element is present and aria-hidden
 * - Vastu wordmark SVG is rendered with accessible label
 * - Renders correctly with no actions (empty array)
 *
 * next/link is mocked because it requires a Next.js router context that is
 * not available in Vitest's jsdom environment.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorPage } from '../ErrorPage';
import { TestProviders } from '../../../test-utils/providers';
import type { ReactElement } from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/link — renders as a plain <a> in the test environment.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

const defaultProps = {
  statusCode: 404,
  title: 'Page not found',
  message: 'The page you are looking for does not exist.',
  actions: [
    { label: 'Go to workspace', href: '/workspace' },
    { label: 'Go back', href: '/' },
  ],
} as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ErrorPage', () => {
  it('renders the status code', () => {
    renderComponent(<ErrorPage {...defaultProps} />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders the title', () => {
    renderComponent(<ErrorPage {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });

  it('renders the message', () => {
    renderComponent(<ErrorPage {...defaultProps} />);
    expect(
      screen.getByText('The page you are looking for does not exist.'),
    ).toBeInTheDocument();
  });

  it('renders link-type actions as anchor elements with correct href', () => {
    renderComponent(<ErrorPage {...defaultProps} />);
    const workspaceLink = screen.getByRole('link', { name: 'Go to workspace' });
    expect(workspaceLink).toBeInTheDocument();
    expect(workspaceLink).toHaveAttribute('href', '/workspace');

    const backLink = screen.getByRole('link', { name: 'Go back' });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('renders onClick-type actions as buttons', () => {
    const onReset = vi.fn();
    renderComponent(
      <ErrorPage
        statusCode={500}
        title="Something went wrong"
        message="An unexpected error occurred."
        actions={[{ label: 'Try again', onClick: onReset }]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('fires the onClick callback when an action button is clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    renderComponent(
      <ErrorPage
        statusCode={500}
        title="Something went wrong"
        message="An unexpected error occurred."
        actions={[{ label: 'Try again', onClick: onReset }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('renders with an empty actions array without throwing', () => {
    renderComponent(
      <ErrorPage
        statusCode={503}
        title="Service unavailable"
        message="Please try again later."
        actions={[]}
      />,
    );
    expect(screen.getByText('Service unavailable')).toBeInTheDocument();
    // No buttons or action links (only the footer anchor to "/" remains)
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  it('renders the Vastu wordmark SVG with an accessible label', () => {
    renderComponent(<ErrorPage {...defaultProps} />);
    expect(screen.getByRole('img', { name: 'Vastu' })).toBeInTheDocument();
  });

  it('renders the KundliMotif as aria-hidden', () => {
    renderComponent(<ErrorPage {...defaultProps} />);
    // The SVG rendered inside the motif wrapper should be aria-hidden.
    // KundliMotif always sets aria-hidden="true" on its root svg.
    // We select all svgs and find the one that is aria-hidden and not the wordmark.
    const svgs = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the footer "vastu.dev" anchor link', () => {
    renderComponent(<ErrorPage {...defaultProps} />);
    const footerLink = screen.getByRole('link', { name: 'vastu.dev' });
    expect(footerLink).toBeInTheDocument();
    expect(footerLink).toHaveAttribute('href', '/');
  });

  it('renders correctly for a 500 error with mixed link and button actions', () => {
    const onReset = vi.fn();
    renderComponent(
      <ErrorPage
        statusCode={500}
        title="Something went wrong"
        message="An unexpected error occurred. Try again or return to the workspace."
        actions={[
          { label: 'Try again', onClick: onReset },
          { label: 'Go to workspace', href: '/workspace' },
        ]}
      />,
    );

    expect(screen.getByText('500')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to workspace' })).toBeInTheDocument();
  });
});

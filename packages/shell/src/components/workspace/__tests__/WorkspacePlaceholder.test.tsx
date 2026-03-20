/**
 * Tests for WorkspacePlaceholder component.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspacePlaceholder } from '../WorkspacePlaceholder';
import { TestProviders } from '@/test-utils/providers';

function renderComponent() {
  return render(<WorkspacePlaceholder />, { wrapper: TestProviders });
}

describe('WorkspacePlaceholder', () => {
  it('renders the placeholder message', () => {
    renderComponent();

    expect(
      screen.getByText(
        'The workspace is being built in Phase 1. This is where Dockview, page templates, and the view engine will live.',
      ),
    ).toBeInTheDocument();
  });

  it('renders an icon (aria-hidden)', () => {
    renderComponent();

    // The EmptyState renders an SVG icon with aria-hidden=true
    const icon = document.querySelector('svg[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders no action button (placeholder has no action)', () => {
    renderComponent();

    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });
});

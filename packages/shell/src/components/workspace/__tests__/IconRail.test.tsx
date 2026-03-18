/**
 * Tests for IconRail component.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconRail } from '../IconRail';
import { TestProviders } from '../../../test-utils/providers';

function renderComponent() {
  return render(<IconRail />, { wrapper: TestProviders });
}

describe('IconRail', () => {
  it('renders a nav landmark with accessible label', () => {
    renderComponent();

    const nav = screen.getByRole('navigation', { name: 'Workspace navigation' });
    expect(nav).toBeInTheDocument();
  });

  it('renders the Vastu logo link to /workspace', () => {
    renderComponent();

    const logoLink = screen.getByRole('link', { name: 'Go to workspace' });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', '/workspace');
  });

  it('renders the Settings icon link to /settings', () => {
    renderComponent();

    const settingsLink = screen.getByRole('link', { name: 'Settings' });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('renders the settings icon svg as aria-hidden', () => {
    renderComponent();

    // The IconSettings renders an SVG with aria-hidden=true
    const icon = document.querySelector('svg[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders logo mark text "V" for the Vastu logo', () => {
    renderComponent();

    const logoLink = screen.getByRole('link', { name: 'Go to workspace' });
    expect(logoLink).toHaveTextContent('V');
  });
});

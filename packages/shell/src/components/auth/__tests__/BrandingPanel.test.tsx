/**
 * BrandingPanel tests — auth split layout branding panel.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandingPanel } from '../BrandingPanel';
import { TestProviders } from '../../../test-utils/providers';

function renderComponent() {
  return render(<BrandingPanel />, { wrapper: TestProviders });
}

describe('BrandingPanel', () => {
  it('renders the Vastu brand name', () => {
    renderComponent();
    expect(screen.getByText('Vastu')).toBeInTheDocument();
  });

  it('renders the tagline text', () => {
    renderComponent();
    expect(screen.getByText('Enterprise Application Platform')).toBeInTheDocument();
  });

  it('renders the KundliMotif SVG as decorative (aria-hidden)', () => {
    renderComponent();
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('KundliMotif SVG has the correct viewBox', () => {
    renderComponent();
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 300 300');
  });
});

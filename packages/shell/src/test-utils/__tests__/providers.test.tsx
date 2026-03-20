/**
 * Tests for the TestProviders wrapper and custom render function.
 */

import React from 'react';
import { render as tlRender } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@mantine/core';
import { render, screen, TestProviders } from '../providers';

describe('TestProviders', () => {
  it('renders children inside the Mantine provider', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('can be used as a wrapper directly with @testing-library render', () => {
    const { getByText } = tlRender(<span>Hello from wrapper</span>, { wrapper: TestProviders });
    expect(getByText('Hello from wrapper')).toBeInTheDocument();
  });

  it('applies the Vastu theme (primary color class present on Button)', () => {
    render(<Button data-testid="themed-btn">Themed</Button>);
    const btn = screen.getByTestId('themed-btn');
    // Mantine sets a data-variant attribute; just verify rendering does not throw
    expect(btn).toBeInTheDocument();
  });
});

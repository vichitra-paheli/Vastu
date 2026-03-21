/**
 * Component tests for WorkspaceProviders.
 *
 * Tests cover:
 * - Renders children correctly
 * - Provides QueryClient context (TanStack Query)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { WorkspaceProviders } from '../WorkspaceProviders';
import { MantineProvider } from '@mantine/core';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <WorkspaceProviders>{children}</WorkspaceProviders>
    </MantineProvider>
  );
}

describe('WorkspaceProviders', () => {
  it('renders children', () => {
    render(
      <TestWrapper>
        <div data-testid="child">Hello</div>
      </TestWrapper>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('provides QueryClient context so useQuery works inside', () => {
    // A component that uses useQuery — if QueryClientProvider is missing, this throws
    function QueryConsumer() {
      const { status } = useQuery({ queryKey: ['test'], queryFn: () => null, enabled: false });
      return <div data-testid="status">{status}</div>;
    }

    render(
      <TestWrapper>
        <QueryConsumer />
      </TestWrapper>,
    );

    expect(screen.getByTestId('status')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <TestWrapper>
        <span data-testid="a">A</span>
        <span data-testid="b">B</span>
      </TestWrapper>,
    );
    expect(screen.getByTestId('a')).toBeInTheDocument();
    expect(screen.getByTestId('b')).toBeInTheDocument();
  });
});

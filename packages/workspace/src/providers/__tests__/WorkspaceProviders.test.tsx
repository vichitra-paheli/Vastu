/**
 * Component tests for WorkspaceProviders.
 *
 * Tests cover:
 * - Renders children correctly
 * - Provides QueryClient context (TanStack Query)
 * - Mounts SSEProvider so useSSEContext works for descendants
 *
 * Note: useWorkspaceEvents is mocked to prevent real EventSource connections
 * in tests. The SSEProvider internally calls useWorkspaceEvents.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceProviders } from '../WorkspaceProviders';
import { useSSEContext } from '../SSEProvider';
import { MantineProvider } from '@mantine/core';

// Mock useWorkspaceEvents so SSEProvider doesn't create real EventSource connections.
vi.mock('../../hooks/useWorkspaceEvents', () => ({
  useWorkspaceEvents: vi.fn(),
}));

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

  it('provides SSEContext so useSSEContext works inside', () => {
    // A component that calls useSSEContext — should not throw.
    function SSEConsumer() {
      const { subscribe } = useSSEContext();
      return <div data-testid="sse-ok">{typeof subscribe}</div>;
    }

    render(
      <TestWrapper>
        <SSEConsumer />
      </TestWrapper>,
    );

    expect(screen.getByTestId('sse-ok')).toHaveTextContent('function');
  });
});

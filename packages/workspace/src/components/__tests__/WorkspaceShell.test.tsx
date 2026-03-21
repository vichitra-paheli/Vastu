/**
 * Component tests for WorkspaceShell.
 *
 * Tests cover:
 * - Renders the three regions: sidebar, main content, tray bar
 * - Sidebar data-collapsed attribute reflects store state
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { WorkspaceShell } from '../WorkspaceShell';
import { useSidebarStore } from '../../stores/sidebarStore';
import { TestProviders } from '../../test-utils/providers';

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

describe('WorkspaceShell', () => {
  beforeEach(() => {
    useSidebarStore.setState({ collapsed: false });
  });

  it('renders the sidebar region', () => {
    renderWithProviders(<WorkspaceShell />);
    expect(screen.getByRole('complementary', { name: /workspace sidebar/i })).toBeInTheDocument();
  });

  it('renders the main content region', () => {
    renderWithProviders(<WorkspaceShell />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the tray bar region', () => {
    renderWithProviders(<WorkspaceShell />);
    expect(screen.getByRole('region', { name: /workspace tray/i })).toBeInTheDocument();
  });

  it('renders children inside the main content area', () => {
    renderWithProviders(
      <WorkspaceShell>
        <div data-testid="child-content">Hello workspace</div>
      </WorkspaceShell>,
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('sidebar has data-collapsed="false" when expanded', () => {
    useSidebarStore.setState({ collapsed: false });
    renderWithProviders(<WorkspaceShell />);
    const sidebar = screen.getByRole('complementary', { name: /workspace sidebar/i });
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  it('sidebar has data-collapsed="true" when collapsed', () => {
    useSidebarStore.setState({ collapsed: true });
    renderWithProviders(<WorkspaceShell />);
    const sidebar = screen.getByRole('complementary', { name: /workspace sidebar/i });
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  });
});

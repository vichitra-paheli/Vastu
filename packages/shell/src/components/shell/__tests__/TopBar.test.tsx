/**
 * TopBar tests — shell top navigation bar.
 *
 * Tests:
 * - Logo renders and links to /workspace
 * - Back to workspace link renders
 * - User name is passed to UserMenu
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from '../TopBar';
import { TestProviders } from '../../../test-utils/providers';

// Mock next/navigation for Breadcrumb and UserMenu child components
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/settings/profile'),
}));

// Mock next/link
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

// Mock next-auth/react — UserMenu uses signOut
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

function renderTopBar(overrides?: Partial<{ userName: string; userEmail: string; userRole: string }>) {
  const props = {
    userName: 'Alice Admin',
    userEmail: 'alice@vastu.dev',
    userRole: 'admin',
    ...overrides,
  };
  return render(<TopBar {...props} />, { wrapper: TestProviders });
}

describe('TopBar', () => {
  it('renders the Vastu logo text', () => {
    renderTopBar();
    expect(screen.getByText('Vastu')).toBeInTheDocument();
  });

  it('logo links to /workspace', () => {
    renderTopBar();
    // There are two links to /workspace: logo + back link. Get the one with aria-label.
    const logoLink = screen.getByRole('link', { name: /vastu.*back to workspace/i });
    expect(logoLink).toHaveAttribute('href', '/workspace');
  });

  it('renders "← Back to workspace" link', () => {
    renderTopBar();
    expect(screen.getByText('← Back to workspace')).toBeInTheDocument();
  });

  it('"← Back to workspace" links to /workspace', () => {
    renderTopBar();
    const backLink = screen.getByText('← Back to workspace').closest('a');
    expect(backLink).toHaveAttribute('href', '/workspace');
  });

  it('renders the header element', () => {
    renderTopBar();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the user name in the user menu', () => {
    renderTopBar({ userName: 'Bob Builder' });
    expect(screen.getByText('Bob Builder')).toBeInTheDocument();
  });

  it('passes the correct email to user menu', () => {
    renderTopBar({ userEmail: 'alice@vastu.dev' });
    // UserMenu button is accessible via aria-label which includes the user name
    const avatarButton = screen.getByRole('button', { name: /user menu for alice admin/i });
    expect(avatarButton).toBeInTheDocument();
  });
});

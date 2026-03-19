/**
 * SideNav tests — shell navigation component.
 *
 * Tests:
 * - SETTINGS section renders for all users
 * - ADMIN section hidden for non-admin users
 * - ADMIN section visible for admin users
 * - Active state detection (via SideNavItem)
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SideNav } from '../SideNav';
import { TestProviders } from '@/test-utils/providers';

// Mock next/navigation — SideNavItem uses usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/settings/profile'),
}));

// Mock next/link — renders as <a> in tests
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

function renderSideNav(isAdmin: boolean) {
  return render(<SideNav isAdmin={isAdmin} />, { wrapper: TestProviders });
}

describe('SideNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SETTINGS section', () => {
    it('renders the SETTINGS section label for non-admin users', () => {
      renderSideNav(false);
      // The section label text is uppercase "SETTINGS"
      expect(screen.getByText('SETTINGS')).toBeInTheDocument();
    });

    it('renders the SETTINGS section label for admin users', () => {
      renderSideNav(true);
      expect(screen.getByText('SETTINGS')).toBeInTheDocument();
    });

    it('renders all settings nav items', () => {
      renderSideNav(false);
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText('DB Connections')).toBeInTheDocument();
      expect(screen.getByText('API Keys')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('SSO')).toBeInTheDocument();
    });

    it('renders settings nav items as links with correct hrefs', () => {
      renderSideNav(false);
      const profileLink = screen.getByRole('link', { name: /profile/i });
      expect(profileLink).toHaveAttribute('href', '/settings/profile');
    });
  });

  describe('ADMIN section — non-admin user', () => {
    it('hides the ADMIN section label for non-admin users', () => {
      renderSideNav(false);
      expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();
    });

    it('hides admin nav items for non-admin users', () => {
      renderSideNav(false);
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Roles')).not.toBeInTheDocument();
      expect(screen.queryByText('Permissions')).not.toBeInTheDocument();
      expect(screen.queryByText('Tenants')).not.toBeInTheDocument();
      expect(screen.queryByText('Audit Log')).not.toBeInTheDocument();
    });
  });

  describe('ADMIN section — admin user', () => {
    it('shows the ADMIN section label for admin users', () => {
      renderSideNav(true);
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('renders all admin nav items for admin users', () => {
      renderSideNav(true);
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Roles')).toBeInTheDocument();
      expect(screen.getByText('Permissions')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
    });

    it('renders admin nav items as links with correct hrefs', () => {
      renderSideNav(true);
      const usersLink = screen.getByRole('link', { name: /users/i });
      expect(usersLink).toHaveAttribute('href', '/admin/users');
    });
  });

  describe('Active state', () => {
    it('marks the active nav item with aria-current="page"', () => {
      // usePathname is mocked to return /settings/profile
      renderSideNav(false);
      const profileLink = screen.getByRole('link', { name: /profile/i });
      expect(profileLink).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark inactive items with aria-current', () => {
      renderSideNav(false);
      const orgLink = screen.getByRole('link', { name: /organization/i });
      expect(orgLink).not.toHaveAttribute('aria-current');
    });
  });

  it('has accessible nav landmark', () => {
    renderSideNav(false);
    expect(screen.getByRole('navigation', { name: 'Shell navigation' })).toBeInTheDocument();
  });
});

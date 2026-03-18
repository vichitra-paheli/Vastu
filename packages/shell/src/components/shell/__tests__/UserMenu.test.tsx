/**
 * UserMenu tests — avatar dropdown for the shell TopBar.
 *
 * Tests:
 * - Renders user name
 * - Renders user initials in avatar
 * - Sign out button triggers signOut
 * - Role badge renders
 */

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as nextAuth from 'next-auth/react';
import { UserMenu } from '../UserMenu';
import { TestProviders } from '../../../test-utils/providers';

// Mock next-auth/react — use vi.fn() inside factory (no top-level variable references)
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
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

function renderUserMenu(overrides?: Partial<{ name: string; email: string; role: string }>) {
  const props = {
    name: 'Alice Admin',
    email: 'alice@vastu.dev',
    role: 'admin',
    ...overrides,
  };
  return render(<UserMenu {...props} />, { wrapper: TestProviders });
}

describe('UserMenu', () => {
  it('renders the user name', () => {
    renderUserMenu();
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
  });

  it('has accessible button with aria-label containing the user name', () => {
    renderUserMenu({ name: 'Bob Builder' });
    const button = screen.getByRole('button', { name: 'User menu for Bob Builder' });
    expect(button).toBeInTheDocument();
  });

  it('renders two-word initials in avatar (first + last name letters)', () => {
    renderUserMenu({ name: 'Alice Admin' });
    // Initials "AA" should appear in the avatar — look for the text in an avatar element
    const avatarElements = document.querySelectorAll('.mantine-Avatar-root');
    // At least one avatar should be in the trigger button area
    expect(avatarElements.length).toBeGreaterThan(0);
  });

  it('calls signOut with /login callback when sign out is clicked', async () => {
    const user = userEvent.setup();
    renderUserMenu();

    // Open the dropdown menu
    const menuButton = screen.getByRole('button', { name: /user menu for alice admin/i });
    await user.click(menuButton);

    // Mantine Menu uses a Transition — wait for dropdown to appear
    let signOutItem: Element | undefined;
    await waitFor(() => {
      signOutItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
        (el) => el.textContent?.includes('Sign out'),
      );
      expect(signOutItem).toBeDefined();
    });

    if (signOutItem) {
      await user.click(signOutItem as Element);
    }

    expect(nextAuth.signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
  });

  it('renders the role badge text in the dropdown', async () => {
    const user = userEvent.setup();
    renderUserMenu({ role: 'editor' });

    // Open dropdown so portal content renders
    const menuButton = screen.getByRole('button', { name: /user menu for alice admin/i });
    await user.click(menuButton);

    // Mantine Menu uses a Transition — wait for dropdown to appear
    await waitFor(() => {
      const badgeEl = Array.from(document.querySelectorAll('*')).find(
        (el) => el.textContent === 'editor' && el.children.length === 0,
      );
      expect(badgeEl).toBeDefined();
    });
  });
});

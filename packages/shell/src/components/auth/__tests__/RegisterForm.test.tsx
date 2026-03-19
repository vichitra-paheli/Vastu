/**
 * RegisterForm tests.
 *
 * Tests cover:
 * - Rendering of all form fields, buttons, and links
 * - Validation errors on blur for each field
 * - PasswordStrengthBar renders when password is typed
 *
 * next/link and fetch are mocked because they require
 * a browser/Next.js runtime that is not available in Vitest's jsdom environment.
 * Email validation and strength calculation are inlined in the component
 * (not imported from @vastu/shared/utils), so no shared package mock is needed.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RegisterForm } from '../RegisterForm';
import { TestProviders } from '@/test-utils/providers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/link — renders as a plain anchor in test env.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock global fetch so submit does not make real HTTP calls.
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 201,
  json: async () => ({ success: true, userId: 'u1', organizationId: 'o1' }),
});
vi.stubGlobal('fetch', mockFetch);

// Mock window.location.href setter to prevent jsdom navigation errors.
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent() {
  return render(<RegisterForm />, { wrapper: TestProviders });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, userId: 'u1', organizationId: 'o1' }),
    });
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the full name input field', () => {
    renderComponent();
    expect(screen.getByLabelText(/full name \*/i)).toBeInTheDocument();
  });

  it('renders the organization name input field', () => {
    renderComponent();
    expect(screen.getByLabelText(/organization name \*/i)).toBeInTheDocument();
  });

  it('renders the work email input field', () => {
    renderComponent();
    expect(screen.getByLabelText(/work email \*/i)).toBeInTheDocument();
  });

  it('renders the password input field', () => {
    renderComponent();
    // Mantine PasswordInput labels include "Password *"
    expect(screen.getByLabelText(/^password \*/i)).toBeInTheDocument();
  });

  it('renders the confirm password input field', () => {
    renderComponent();
    expect(screen.getByLabelText(/confirm password \*/i)).toBeInTheDocument();
  });

  it('renders the terms checkbox', () => {
    renderComponent();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders the create account submit button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders the sign in link pointing to /login', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: /already have an account/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  // ── Validation — full name field ────────────────────────────────────────

  it('shows a validation error when full name is blurred empty', async () => {
    renderComponent();
    const nameInput = screen.getByLabelText(/full name \*/i);

    fireEvent.focus(nameInput);
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
    });
  });

  it('does not show a name error when a name is entered', async () => {
    renderComponent();
    const nameInput = screen.getByLabelText(/full name \*/i);

    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
    });
  });

  // ── Validation — organization name field ────────────────────────────────

  it('shows a validation error when organization name is blurred empty', async () => {
    renderComponent();
    const orgInput = screen.getByLabelText(/organization name \*/i);

    fireEvent.focus(orgInput);
    fireEvent.blur(orgInput);

    await waitFor(() => {
      expect(screen.getByText('Organization name is required')).toBeInTheDocument();
    });
  });

  // ── Validation — email field ────────────────────────────────────────────

  it('shows a validation error when email is blurred empty', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/work email \*/i);

    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Work email is required')).toBeInTheDocument();
    });
  });

  it('shows a validation error when email format is invalid', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/work email \*/i);

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    });
  });

  it('does not show an email error when a valid email is entered', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/work email \*/i);

    fireEvent.change(emailInput, { target: { value: 'jane@company.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByText('Work email is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
    });
  });

  // ── Validation — password field ─────────────────────────────────────────

  it('shows a validation error when password is blurred empty', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);

    fireEvent.focus(passwordInput);
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('shows a validation error when password is shorter than 8 characters', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  // ── Validation — confirm password field ─────────────────────────────────

  it('shows a validation error when confirm password is blurred empty', async () => {
    renderComponent();
    const confirmInput = screen.getByPlaceholderText(/repeat your password/i);

    fireEvent.focus(confirmInput);
    fireEvent.blur(confirmInput);

    await waitFor(() => {
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });
  });

  it('shows a validation error when passwords do not match', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmInput = screen.getByPlaceholderText(/repeat your password/i);

    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.blur(passwordInput);
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass1!' } });
    fireEvent.blur(confirmInput);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  // ── Validation — terms checkbox ─────────────────────────────────────────

  it('shows a validation error when terms checkbox is unchecked on submit attempt', async () => {
    renderComponent();
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('You must accept the Terms of Service to continue'),
      ).toBeInTheDocument();
    });
  });

  // ── PasswordStrengthBar integration ─────────────────────────────────────

  it('shows no strength bar when password is empty', () => {
    renderComponent();
    // Labels like 'Weak', 'Fair', 'Good', 'Strong' should not be present.
    expect(screen.queryByText(/^(Weak|Fair|Good|Strong)$/)).not.toBeInTheDocument();
  });

  it('shows a strength label when password is typed', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);

    fireEvent.change(passwordInput, { target: { value: 'abc' } });

    await waitFor(() => {
      // Any strength label should appear — 'abc' scores weak.
      expect(screen.getByText(/^(Weak|Fair|Good|Strong)$/)).toBeInTheDocument();
    });
  });

  it('shows "Weak" for a short simple password', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);

    fireEvent.change(passwordInput, { target: { value: 'abc' } });

    await waitFor(() => {
      expect(screen.getByText('Weak')).toBeInTheDocument();
    });
  });

  it('shows "Strong" for a complex password meeting all criteria', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);

    fireEvent.change(passwordInput, { target: { value: 'Str0ng!Pass#2024' } });

    await waitFor(() => {
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });
});

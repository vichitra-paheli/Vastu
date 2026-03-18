/**
 * ForgotPasswordForm tests — forgot password form component.
 *
 * Tests cover:
 * - Rendering of form fields, buttons, and navigation links
 * - Validation errors on blur (empty field, invalid email format)
 * - Success state rendered after a successful API response
 * - Error state rendered after a failed API response
 *
 * next/link and next/navigation are mocked because they require a
 * browser/Next.js runtime not available in Vitest's jsdom environment.
 * fetch is mocked to avoid real network calls.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForgotPasswordForm } from '../ForgotPasswordForm';
import { TestProviders } from '../../../test-utils/providers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent() {
  return render(<ForgotPasswordForm />, { wrapper: TestProviders });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the page title', () => {
    renderComponent();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the email input field', () => {
    renderComponent();
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument();
  });

  it('renders the send reset link button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders the back to sign in link pointing to /login', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: /back to sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it('shows a validation error when email field is blurred empty', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email \*/i);

    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('shows a validation error when email has an invalid format', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email \*/i);

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    });
  });

  it('does not show an email error for a valid email', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email \*/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
    });
  });

  // ── Success state ──────────────────────────────────────────────────────────

  it('shows a success message after a successful API response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    renderComponent();

    const emailInput = screen.getByLabelText(/email \*/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Mantine Alert always renders with role="alert" regardless of the role prop.
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // The form itself should no longer be visible.
    expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument();
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it('shows an error alert when the API returns a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }),
    );

    renderComponent();

    const emailInput = screen.getByLabelText(/email \*/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

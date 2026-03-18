/**
 * MfaChallengeForm tests
 *
 * Tests cover:
 * - Renders OTP input (6 digit fields) in TOTP mode by default
 * - Renders the title and subtitle
 * - Renders the "Use a recovery code" toggle link
 * - Renders the "← Back to sign in" link pointing to /login
 * - Clicking "Use a recovery code" switches to recovery code mode
 * - Recovery mode shows a text input and submit button
 * - Recovery mode shows "Use authenticator app instead" toggle
 * - Clicking "Use authenticator app instead" switches back to TOTP mode
 * - Shows inline error alert when an error is present (simulated via fetch mock)
 *
 * next/navigation and next/link are mocked because they require a
 * browser/Next.js runtime not available in Vitest's jsdom environment.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MfaChallengeForm } from '../MfaChallengeForm';
import { TestProviders } from '../../../test-utils/providers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/navigation — useSearchParams is used to read the ?redirect param.
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

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

// Mock fetch globally — we don't want real network calls in unit tests.
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent() {
  return render(<MfaChallengeForm />, { wrapper: TestProviders });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MfaChallengeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  // ── Default TOTP mode ─────────────────────────────────────────────────────

  it('renders the MFA challenge title in TOTP mode', () => {
    renderComponent();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Two-factor authentication',
    );
  });

  it('renders the TOTP mode subtitle', () => {
    renderComponent();
    expect(
      screen.getByText('Enter the 6-digit code from your authenticator app'),
    ).toBeInTheDocument();
  });

  it('renders exactly 6 OTP input fields', () => {
    renderComponent();
    const inputs = screen.getAllByRole('textbox');
    // The OTP component renders 6 inputs; TOTP mode has no extra text inputs.
    expect(inputs).toHaveLength(6);
  });

  it('renders the OTP input dash separator', () => {
    renderComponent();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the "Use a recovery code" toggle link', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: /use a recovery code/i }),
    ).toBeInTheDocument();
  });

  it('renders the "← Back to sign in" link pointing to /login', () => {
    renderComponent();
    const backLink = screen.getByRole('link', { name: /back to sign in/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/login');
  });

  it('does not show an error alert initially', () => {
    renderComponent();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // ── Toggle to recovery mode ────────────────────────────────────────────────

  it('switches to recovery mode when "Use a recovery code" is clicked', async () => {
    renderComponent();

    const toggleButton = screen.getByRole('button', { name: /use a recovery code/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1 }),
      ).toHaveTextContent('Use a recovery code');
    });
  });

  it('shows recovery code text input after toggling to recovery mode', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /use a recovery code/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/recovery code \*/i)).toBeInTheDocument();
    });
  });

  it('shows recovery code submit button in recovery mode', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /use a recovery code/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /verify recovery code/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows "Use authenticator app instead" toggle in recovery mode', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /use a recovery code/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /use authenticator app instead/i }),
      ).toBeInTheDocument();
    });
  });

  it('does not show OTP input fields in recovery mode', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /use a recovery code/i }));

    await waitFor(() => {
      // In recovery mode there should be exactly 1 text input (the recovery code field),
      // not 6 OTP inputs.
      const textboxes = screen.getAllByRole('textbox');
      expect(textboxes).toHaveLength(1);
    });
  });

  // ── Toggle back to TOTP mode ───────────────────────────────────────────────

  it('switches back to TOTP mode when "Use authenticator app instead" is clicked', async () => {
    renderComponent();

    // Switch to recovery mode first.
    fireEvent.click(screen.getByRole('button', { name: /use a recovery code/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /use authenticator app instead/i }),
      ).toBeInTheDocument();
    });

    // Switch back to TOTP mode.
    fireEvent.click(screen.getByRole('button', { name: /use authenticator app instead/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(6);
    });
  });

  // ── Recovery code validation ───────────────────────────────────────────────

  it('shows a validation error when recovery code is submitted empty', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /use a recovery code/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /verify recovery code/i }),
      ).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /verify recovery code/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/recovery code is required/i)).toBeInTheDocument();
    });
  });

  // ── Error state from API ───────────────────────────────────────────────────

  it('shows an inline error alert when the recovery code API returns an error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid recovery code. Please check and try again.' }),
    });

    renderComponent();

    // Switch to recovery mode.
    fireEvent.click(screen.getByRole('button', { name: /use a recovery code/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/recovery code \*/i)).toBeInTheDocument();
    });

    const recoveryInput = screen.getByLabelText(/recovery code \*/i);
    fireEvent.change(recoveryInput, { target: { value: 'ABCD-1234' } });

    const submitButton = screen.getByRole('button', { name: /verify recovery code/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid recovery code. Please check and try again.',
      );
    });
  });
});

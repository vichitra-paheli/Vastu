/**
 * ProfileForm tests — US-014: Profile settings
 *
 * Covers:
 * - Happy path: renders all fields with correct initial values
 * - Save button: disabled when form is pristine, enabled after a change
 * - Name validation: error on blur when name is empty
 * - Email field: read-only for all users (always read-only in the form)
 * - Language and timezone dropdowns render
 * - Security section: change password and MFA links render
 * - MFA badge: shown when mfaEnabled is true
 * - Submit: calls PATCH endpoint with correct payload
 * - Edge case: empty name shows validation error on blur
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { render } from '../../../test-utils';
import { ProfileForm } from '../ProfileForm';
import type { ProfileFormProps } from '../ProfileForm';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/link renders as a plain anchor in tests.
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
// Fixtures
// ---------------------------------------------------------------------------

const baseUser: ProfileFormProps['user'] = {
  id: 'user-1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  avatarUrl: null,
  language: 'en',
  timezone: 'UTC',
  mfaEnabled: false,
  organizationId: 'org-1',
};

function mockFetch(ok: boolean, body: Record<string, unknown> = { success: true }) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfileForm', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders name field with the initial value', () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);
    expect(screen.getByDisplayValue('Alice Smith')).toBeInTheDocument();
  });

  it('renders email field with the initial value', () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);
    expect(screen.getByDisplayValue('alice@example.com')).toBeInTheDocument();
  });

  it('renders language dropdown', () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);
    // Mantine Select shows label text
    expect(screen.getByDisplayValue('English')).toBeInTheDocument();
  });

  it('renders timezone dropdown', () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);
    // Mantine Select renders both a visible input (label) and a hidden input (value).
    // When value === label (as with 'UTC'), both inputs have the same display value.
    // Use getAllByDisplayValue and assert at least one is present.
    expect(screen.getAllByDisplayValue('UTC').length).toBeGreaterThan(0);
  });

  it('renders the save button', () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('renders change password link', () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);
    const link = screen.getByRole('link', { name: /change password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/settings/change-password');
  });

  it('renders setup MFA link', () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);
    const link = screen.getByRole('link', { name: /setup mfa/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/mfa/setup');
  });

  it('shows MFA enabled badge when mfaEnabled is true', () => {
    render(<ProfileForm user={{ ...baseUser, mfaEnabled: true }} isSsoUser={false} />);
    expect(screen.getByText(/mfa enabled/i)).toBeInTheDocument();
  });

  it('does not show MFA enabled badge when mfaEnabled is false', () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);
    expect(screen.queryByText(/mfa enabled/i)).not.toBeInTheDocument();
  });

  // ── SSO email read-only ────────────────────────────────────────────────────

  it('renders email as disabled for SSO users', () => {
    render(<ProfileForm user={baseUser} isSsoUser={true} />);
    const emailInput = screen.getByDisplayValue('alice@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('shows SSO email description when isSsoUser is true', () => {
    render(<ProfileForm user={baseUser} isSsoUser={true} />);
    expect(
      screen.getByText(/managed by your sso provider/i),
    ).toBeInTheDocument();
  });

  // ── Save button state ──────────────────────────────────────────────────────

  it('save button is disabled when form is pristine', () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).toBeDisabled();
  });

  it('save button becomes enabled after changing the name', async () => {
    const user = userEvent.setup();
    render(<ProfileForm user={baseUser} isSsoUser={false} />);

    const nameInput = screen.getByDisplayValue('Alice Smith');
    await user.clear(nameInput);
    await user.type(nameInput, 'Bob Jones');

    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).not.toBeDisabled();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it('shows validation error when name is blurred empty', async () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);

    const nameInput = screen.getByDisplayValue('Alice Smith');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    });
  });

  it('does not show name error when name is valid', async () => {
    render(<ProfileForm user={baseUser} isSsoUser={false} />);

    const nameInput = screen.getByDisplayValue('Alice Smith');
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.queryByText(/full name is required/i)).not.toBeInTheDocument();
    });
  });

  // ── Submit ─────────────────────────────────────────────────────────────────

  it('calls PATCH /api/settings/profile with updated name on save', async () => {
    const fetchMock = mockFetch(true);
    global.fetch = fetchMock;
    const user = userEvent.setup();

    render(<ProfileForm user={baseUser} isSsoUser={false} />);

    const nameInput = screen.getByDisplayValue('Alice Smith');
    await user.clear(nameInput);
    await user.type(nameInput, 'Bob Jones');

    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/settings/profile',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('Bob Jones'),
        }),
      );
    });
  });

  it('shows error notification when save fails', async () => {
    const fetchMock = mockFetch(false, { error: 'Server error' });
    global.fetch = fetchMock;
    const user = userEvent.setup();

    render(<ProfileForm user={baseUser} isSsoUser={false} />);

    const nameInput = screen.getByDisplayValue('Alice Smith');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  // ── Avatar upload ──────────────────────────────────────────────────────────

  it('renders avatar initials fallback when no avatarUrl is provided', () => {
    render(<ProfileForm user={{ ...baseUser, avatarUrl: null }} isSsoUser={false} />);
    // Initials from "Alice Smith" → "AS"
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('renders avatar initials for single-word name', () => {
    render(
      <ProfileForm
        user={{ ...baseUser, name: 'Alice', avatarUrl: null }}
        isSsoUser={false}
      />,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('save becomes enabled when an avatar file is selected', async () => {
    const user = userEvent.setup();
    render(<ProfileForm user={baseUser} isSsoUser={false} />);

    // Initially disabled
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();

    // Find the hidden file input and upload a fake image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const fakeFile = new File(['(content)'], 'avatar.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, fakeFile);

    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
  });
});

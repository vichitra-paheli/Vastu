/**
 * E2E tests — MFA challenge page (/mfa)
 *
 * These tests verify the UI rendering and client-side behaviour of the MFA
 * challenge page WITHOUT requiring Keycloak, Docker, or a live database.
 *
 * Tests that exercise the actual MFA verification flow (submitting a real TOTP
 * code against a live auth session) are marked with test.skip and an explanation,
 * because they require Keycloak running via `docker compose up -d` AND a user
 * account with MFA enabled.
 *
 * Coverage (US-010):
 * - AC-4:  MFA challenge page loads with correct title
 * - AC-4:  Six OTP input fields rendered in 3-3 pattern
 * - AC-5:  "Use a recovery code" link is present in TOTP mode
 * - AC-7:  "← Back to sign in" link is present and points to /login
 * - AC-5:  Clicking "Use a recovery code" switches to recovery code mode
 * - AC-5:  Recovery mode shows a text input and submit button
 * - AC-5:  Recovery mode shows a "Use authenticator app instead" toggle
 * - AC-5:  Recovery mode shows a "← Back to sign in" link
 * - AC-3:  Actual TOTP verification (skipped — needs live auth session)
 */

import { test, expect } from '@playwright/test';

test.describe('MFA challenge page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mfa');
  });

  // -------------------------------------------------------------------------
  // Page load
  // -------------------------------------------------------------------------

  test('has the correct document title', async ({ page }) => {
    await expect(page).toHaveTitle(/Two-Factor Authentication.*Vastu/i);
  });

  test('shows the "Two-factor authentication" heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /two-factor authentication/i }),
    ).toBeVisible();
  });

  test('shows the authenticator app subtitle', async ({ page }) => {
    await expect(
      page.getByText(/enter the 6-digit code from your authenticator app/i),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // OTP input fields — 6 digits in 3-3 pattern
  // -------------------------------------------------------------------------

  test('renders six individual OTP digit inputs', async ({ page }) => {
    // Each digit input has aria-label "Digit N" (where N is 1-6).
    // They are rendered as plain <input> elements with inputMode="numeric".
    const digitInputs = page.locator('input[inputmode="numeric"]');
    await expect(digitInputs).toHaveCount(6);
  });

  test('each OTP digit input has a unique accessible label', async ({ page }) => {
    for (let i = 1; i <= 6; i++) {
      const input = page.getByRole('textbox', { name: new RegExp(`digit ${i}`, 'i') });
      await expect(input).toBeVisible();
    }
  });

  test('renders the OTP input group with an accessible group label', async ({ page }) => {
    // The OtpInput component wraps the inputs in a Group with role="group"
    // and aria-label from the label prop ("Authenticator code").
    const group = page.getByRole('group', { name: /authenticator code/i });
    await expect(group).toBeVisible();
  });

  test('OTP inputs are enabled and accept numeric input', async ({ page }) => {
    const firstDigit = page.getByRole('textbox', { name: /digit 1/i });
    await expect(firstDigit).toBeEnabled();
    await firstDigit.fill('4');
    await expect(firstDigit).toHaveValue('4');
  });

  // -------------------------------------------------------------------------
  // Recovery code toggle (TOTP mode)
  // -------------------------------------------------------------------------

  test('shows a "Use a recovery code" toggle in TOTP mode', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /use a recovery code/i });
    await expect(toggle).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Back to sign in link
  // -------------------------------------------------------------------------

  test('shows a "Back to sign in" link pointing to /login', async ({ page }) => {
    const link = page.getByRole('link', { name: /back to sign in/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login');
  });

  test('navigates to /login when "Back to sign in" is clicked', async ({ page }) => {
    await page.getByRole('link', { name: /back to sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  // -------------------------------------------------------------------------
  // Recovery code mode
  // -------------------------------------------------------------------------

  test('switches to recovery code mode when "Use a recovery code" is clicked', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /use a recovery code/i }).click();
    // Heading changes to "Use a recovery code"
    await expect(
      page.getByRole('heading', { name: /use a recovery code/i }),
    ).toBeVisible();
  });

  test('recovery mode hides the OTP digit inputs', async ({ page }) => {
    await page.getByRole('button', { name: /use a recovery code/i }).click();
    // The numeric OTP inputs should no longer be in the document.
    const digitInputs = page.locator('input[inputmode="numeric"]');
    await expect(digitInputs).toHaveCount(0);
  });

  test('recovery mode shows a text input for the recovery code', async ({ page }) => {
    await page.getByRole('button', { name: /use a recovery code/i }).click();
    // The TextInput for the recovery code has an autocomplete="off" attribute.
    const recoveryInput = page.locator('input[autocomplete="off"]');
    await expect(recoveryInput).toBeVisible();
  });

  test('recovery mode shows a "Verify recovery code" submit button', async ({ page }) => {
    await page.getByRole('button', { name: /use a recovery code/i }).click();
    const submitBtn = page.getByRole('button', { name: /verify recovery code/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('recovery mode shows a "Use authenticator app instead" toggle', async ({ page }) => {
    await page.getByRole('button', { name: /use a recovery code/i }).click();
    const toggle = page.getByRole('button', { name: /use authenticator app instead/i });
    await expect(toggle).toBeVisible();
  });

  test('recovery mode shows a "Back to sign in" link', async ({ page }) => {
    await page.getByRole('button', { name: /use a recovery code/i }).click();
    const link = page.getByRole('link', { name: /back to sign in/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login');
  });

  test('clicking "Use authenticator app instead" returns to TOTP mode', async ({ page }) => {
    // Switch to recovery mode first.
    await page.getByRole('button', { name: /use a recovery code/i }).click();
    // Switch back.
    await page.getByRole('button', { name: /use authenticator app instead/i }).click();
    // OTP inputs should reappear.
    const digitInputs = page.locator('input[inputmode="numeric"]');
    await expect(digitInputs).toHaveCount(6);
    // Heading reverts.
    await expect(
      page.getByRole('heading', { name: /two-factor authentication/i }),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Actual TOTP verification — requires a live auth session
  // -------------------------------------------------------------------------

  test.skip('verifies a valid TOTP code and redirects to /workspace', async ({ page }) => {
    // Skipped: requires Keycloak running via `docker compose up -d` AND a user
    // account with MFA enabled. The MFA challenge page only appears mid-auth-flow
    // (after password sign-in), so a full session cannot be set up without
    // the real Keycloak stack.
    //
    // When Keycloak is available:
    // 1. Log in with an MFA-enabled account (password step)
    // 2. The server redirects to /mfa
    // 3. Generate a live TOTP code from the seed TOTP secret
    // 4. Fill each digit input and wait for auto-submit
    // 5. Assert redirect to /workspace
  });

  test.skip('shows an error for an invalid TOTP code', async ({ page }) => {
    // Skipped: requires a live Keycloak session cookie to exist before reaching /mfa.
    // When available, fill an intentionally wrong 6-digit code and assert that
    // the role="alert" error message appears with "Invalid code" text.
  });

  test.skip('verifies a valid recovery code and redirects to /workspace', async ({ page }) => {
    // Skipped: requires a live session AND a known recovery code for a seed user.
    // When available:
    // 1. Switch to recovery mode
    // 2. Enter a valid recovery code from the seed data
    // 3. Submit and assert redirect to /workspace
  });
});

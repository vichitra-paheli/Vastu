/**
 * E2E tests — Password reset flow (/forgot-password and /reset-password)
 *
 * These tests verify the UI rendering and client-side behaviour of both
 * password reset pages WITHOUT requiring Keycloak, Docker, or a live database.
 *
 * Tests that exercise actual email delivery or token validation are marked
 * with test.skip and an explanation.
 *
 * Coverage (US-008):
 * - AC-1:  Forgot-password page loads with email field and submit button
 * - AC-3:  Reset-password page shows new/confirm password fields and submit
 * - AC-4:  Missing token shows error with "Back to sign in" link
 * - AC-6:  Both pages have "Back to sign in" links
 * - AC-2:  Submit sends reset email (skipped — needs email service)
 * - AC-5:  Success redirects to /login with toast (skipped — needs Keycloak)
 */

import { test, expect } from '@playwright/test';
import { SELECTORS } from '../fixtures';

// =============================================================================
// Forgot-password page
// =============================================================================

test.describe('Forgot-password page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  // ---------------------------------------------------------------------------
  // Page load
  // ---------------------------------------------------------------------------

  test('has the correct document title', async ({ page }) => {
    await expect(page).toHaveTitle(/Reset Password.*Vastu/i);
  });

  test('shows the "Reset your password" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Form fields
  // ---------------------------------------------------------------------------

  test('renders the email input', async ({ page }) => {
    const input = page.locator(SELECTORS.forgotPassword.emailInput);
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'email');
  });

  test('renders the "Send reset link" submit button', async ({ page }) => {
    const btn = page.locator(SELECTORS.forgotPassword.submitButton);
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await expect(btn).toHaveText(/send reset link/i);
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  test('shows validation error for empty email on blur', async ({ page }) => {
    await page.locator(SELECTORS.forgotPassword.emailInput).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('shows validation error for invalid email format on blur', async ({ page }) => {
    await page.locator(SELECTORS.forgotPassword.emailInput).fill('invalid-email');
    await page.keyboard.press('Tab');
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('does not show an error alert on initial load', async ({ page }) => {
    await expect(page.locator(SELECTORS.forgotPassword.errorAlert)).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  test('has a "Back to sign in" link pointing to /login', async ({ page }) => {
    const link = page.locator(SELECTORS.forgotPassword.backToSignInLink);
    await expect(link).toBeVisible();
    await expect(link).toHaveText(/back to sign in/i);
  });

  test('navigates to /login when "Back to sign in" is clicked', async ({ page }) => {
    await page.locator(SELECTORS.forgotPassword.backToSignInLink).click();
    await expect(page).toHaveURL(/\/login/);
  });

  // ---------------------------------------------------------------------------
  // Email submission — requires email delivery service
  // ---------------------------------------------------------------------------

  test.skip('shows success state after submitting a valid email', async ({ page }) => {
    // Skipped: requires a running Postgres database and email delivery service.
    // The API always returns 200 (to prevent enumeration) so a POST is needed
    // to verify the success UI state appears. When services are available:
    // 1. Fill a valid email address
    // 2. Submit the form
    // 3. Assert that the success alert is shown (role="status")
    // 4. Assert that the "Back to sign in" link is still visible
    await page.locator(SELECTORS.forgotPassword.emailInput).fill('admin@vastu.dev');
    await page.locator(SELECTORS.forgotPassword.submitButton).click();
    await expect(page.locator(SELECTORS.forgotPassword.successAlert)).toBeVisible();
    await expect(page.locator(SELECTORS.forgotPassword.backToSignInLink)).toBeVisible();
  });
});

// =============================================================================
// Reset-password page
// =============================================================================

test.describe('Reset-password page — no token', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate WITHOUT a token query param to trigger the error state.
    await page.goto('/reset-password');
  });

  // ---------------------------------------------------------------------------
  // Page load (error state when token is absent)
  // ---------------------------------------------------------------------------

  test('has the correct document title', async ({ page }) => {
    await expect(page).toHaveTitle(/Set New Password.*Vastu/i);
  });

  test('shows the "Set new password" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /set new password/i })).toBeVisible();
  });

  test('shows an error alert when no token is present in the URL', async ({ page }) => {
    await expect(page.locator(SELECTORS.resetPassword.errorAlert)).toBeVisible();
    await expect(page.locator(SELECTORS.resetPassword.errorAlert)).toContainText(
      'No reset token found',
    );
  });

  test('hides the password form when no token is present', async ({ page }) => {
    // When token is missing, ResetPasswordForm renders the error branch — no form fields.
    await expect(page.locator(SELECTORS.resetPassword.passwordInput)).not.toBeVisible();
    await expect(page.locator(SELECTORS.resetPassword.submitButton)).not.toBeVisible();
  });

  test('shows a "Back to sign in" link in the no-token error state', async ({ page }) => {
    const link = page.locator(SELECTORS.resetPassword.backToSignInLink);
    await expect(link).toBeVisible();
    await expect(link).toHaveText(/back to sign in/i);
  });

  test('navigates to /login when "Back to sign in" is clicked in the no-token state', async ({
    page,
  }) => {
    await page.locator(SELECTORS.resetPassword.backToSignInLink).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Reset-password page — with token', () => {
  test.beforeEach(async ({ page }) => {
    // Use a plausible-looking but fake token. The UI will render the form
    // regardless of token validity; validity is only checked on submit.
    await page.goto('/reset-password?token=fake-reset-token-for-ui-test');
  });

  // ---------------------------------------------------------------------------
  // Page load (form state when token is present)
  // ---------------------------------------------------------------------------

  test('has the correct document title', async ({ page }) => {
    await expect(page).toHaveTitle(/Set New Password.*Vastu/i);
  });

  test('shows the "Set new password" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /set new password/i })).toBeVisible();
  });

  test('does not show an error alert when a token is present', async ({ page }) => {
    await expect(page.locator(SELECTORS.resetPassword.errorAlert)).not.toBeVisible();
  });

  test('renders the new-password input', async ({ page }) => {
    // Two [autocomplete="new-password"] inputs: password and confirm.
    const inputs = page.locator(SELECTORS.resetPassword.passwordInput);
    await expect(inputs).toHaveCount(2);
  });

  test('renders the "Reset password" submit button', async ({ page }) => {
    const btn = page.locator(SELECTORS.resetPassword.submitButton);
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await expect(btn).toHaveText(/reset password/i);
  });

  test('shows a "Back to sign in" link', async ({ page }) => {
    const link = page.locator(SELECTORS.resetPassword.backToSignInLink);
    await expect(link).toBeVisible();
    await expect(link).toHaveText(/back to sign in/i);
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  test('shows validation error when password is too short on blur', async ({ page }) => {
    const inputs = page.locator(SELECTORS.resetPassword.passwordInput);
    await inputs.first().fill('short');
    await page.keyboard.press('Tab');
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('shows validation error when confirm password does not match', async ({ page }) => {
    const inputs = page.locator(SELECTORS.resetPassword.passwordInput);
    await inputs.first().fill('ValidPass1!');
    await inputs.nth(1).fill('DifferentPass1!');
    await page.keyboard.press('Tab');
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Token validation on submit — requires a real token from the API
  // ---------------------------------------------------------------------------

  test.skip('shows an expired/invalid token error after submitting a bad token', async ({
    page,
  }) => {
    // Skipped: requires a running Postgres database so the API can validate
    // the token and return a 400 response. When available:
    // 1. Fill valid passwords
    // 2. Submit
    // 3. Assert that the token-error alert appears with the expired/invalid message
    const inputs = page.locator(SELECTORS.resetPassword.passwordInput);
    await inputs.first().fill('NewPassword1!');
    await inputs.nth(1).fill('NewPassword1!');
    await page.locator(SELECTORS.resetPassword.submitButton).click();
    await expect(page.locator(SELECTORS.resetPassword.errorAlert)).toBeVisible();
    await expect(page.locator(SELECTORS.resetPassword.errorAlert)).toContainText(
      'invalid or has expired',
    );
  });

  test.skip('shows success state and redirects after a successful reset', async ({ page }) => {
    // Skipped: requires a valid token issued by the Keycloak-backed reset flow.
    // When available, submit valid passwords and assert redirect to /login
    // with a "Password reset successfully" toast.
  });
});

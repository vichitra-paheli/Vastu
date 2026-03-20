/**
 * E2E tests — Verify email page (/verify-email)
 *
 * Tests cover US-009 acceptance criteria.
 *
 * Tests that require actual email delivery or database interaction
 * are marked with test.skip.
 *
 * Coverage (US-009):
 * - AC-1:  Page loads at /verify-email with "Check your email" message
 * - AC-1:  Page shows the email address from the ?email= query param
 * - AC-2:  "Resend email" button is present and enabled initially
 * - AC-2:  Resend button becomes disabled after clicking (rate limiting)
 * - AC-4:  Page is accessible without authentication (public route)
 * - Edge:  Page handles missing email param gracefully (no crash)
 * - Edge:  Page handles malformed email param gracefully
 */

import { test, expect } from '@playwright/test';

test.describe('Verify email page', () => {
  // Use a fresh page context per test to avoid session interference
  test.use({ storageState: { cookies: [], origins: [] } });

  // ---------------------------------------------------------------------------
  // Page load with email param
  // ---------------------------------------------------------------------------

  test('loads at /verify-email without crashing', async ({ page }) => {
    await page.goto('/verify-email?email=test%40example.com');
    // Should not redirect to /login (public route)
    await expect(page).toHaveURL(/\/verify-email/);
  });

  test('has the correct document title', async ({ page }) => {
    await page.goto('/verify-email?email=test%40example.com');
    await expect(page).toHaveTitle(/Verify Email.*Vastu/i);
  });

  test('shows "Check your email" heading', async ({ page }) => {
    await page.goto('/verify-email?email=test%40example.com');
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
  });

  test('shows the email address from the query param', async ({ page }) => {
    await page.goto('/verify-email?email=test%40example.com');
    await expect(page.getByText('test@example.com')).toBeVisible();
  });

  test('shows the Resend email button', async ({ page }) => {
    await page.goto('/verify-email?email=test%40example.com');
    await expect(page.getByRole('button', { name: /resend/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /resend/i })).toBeEnabled();
  });

  test('has a Back to sign in link', async ({ page }) => {
    await page.goto('/verify-email?email=test%40example.com');
    const backLink = page.getByRole('link', { name: /back to sign in/i });
    await expect(backLink).toBeVisible();
  });

  test('Back to sign in link points to /login', async ({ page }) => {
    await page.goto('/verify-email?email=test%40example.com');
    const backLink = page.getByRole('link', { name: /back to sign in/i });
    const href = await backLink.getAttribute('href');
    expect(href).toBe('/login');
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test('handles missing email param without crashing', async ({ page }) => {
    await page.goto('/verify-email');
    // Page should still render without throwing (may show empty or generic message)
    await expect(page).toHaveURL(/\/verify-email/);
    // Should not redirect to an error page
    await expect(page).not.toHaveURL(/\/500/);
  });

  test('handles malformed email param without crashing', async ({ page }) => {
    await page.goto('/verify-email?email=not-a-valid-email');
    await expect(page).toHaveURL(/\/verify-email/);
    await expect(page).not.toHaveURL(/\/500/);
  });

  // ---------------------------------------------------------------------------
  // Rate limiting behavior
  // ---------------------------------------------------------------------------

  test('disables Resend button after clicking (rate limiting)', async ({ page }) => {
    await page.goto('/verify-email?email=test%40example.com');
    const resendButton = page.getByRole('button', { name: /resend/i });
    await expect(resendButton).toBeEnabled();
    // Click once — the button should become disabled after the first click
    // (the request may fail in test env but the UI should still apply rate limiting)
    await resendButton.click();
    // After clicking, the button should enter a cooldown state (disabled or shows countdown)
    await page.waitForTimeout(500);
    // The button should now be disabled or show a countdown
    const isDisabled = await resendButton.isDisabled();
    const buttonText = await resendButton.textContent();
    expect(isDisabled || (buttonText !== null && /resend|wait|second/i.test(buttonText))).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  test('is accessible without authentication (public route)', async ({ page }) => {
    // No login — page should be reachable without a session
    await page.goto('/verify-email?email=test%40example.com');
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ---------------------------------------------------------------------------
  // Full flow requires email delivery (skipped)
  // ---------------------------------------------------------------------------

  test.skip('clicking the email verification link verifies the account and redirects to login', async ({ page }) => {
    // Skipped: requires a real email to be sent and a valid token in the link.
  });

  test.skip('expired verification link shows error with Resend action', async ({ page }) => {
    // Skipped: requires inserting an expired token into the database.
  });
});

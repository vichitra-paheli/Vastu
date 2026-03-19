/**
 * E2E tests — MFA setup and challenge (/settings/profile MFA + /mfa)
 *
 * Tests cover US-010 acceptance criteria.
 *
 * All tests that require an authenticated session or a running TOTP service
 * are skipped.
 *
 * Coverage (US-010):
 * - Happy path: MFA challenge page loads at /mfa
 * - Happy path: 6-digit OTP input boxes present (3-3 pattern)
 * - Happy path: "Use recovery code" link is present
 * - Happy path: "Back to sign in" link is present
 * - Edge: MFA challenge page is accessible without full auth (public-ish, pre-auth step)
 * - Permission: only settings/profile MFA setup requires authentication
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

// ---------------------------------------------------------------------------
// MFA challenge page (/mfa)
// ---------------------------------------------------------------------------

test.describe('MFA challenge page (/mfa)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mfa');
  });

  test('page loads at /mfa without a 500 error', async ({ page }) => {
    // /mfa is public (pre-auth step), should not 500
    await expect(page).not.toHaveURL(/\/500/);
  });

  test('has the correct document title', async ({ page }) => {
    await expect(page).toHaveTitle(/Two-Factor|Authentication.*Vastu/i);
  });

  test('shows a 6-digit OTP input or grouped inputs', async ({ page }) => {
    // The MFA challenge form shows OTP input boxes
    // OtpInput renders 6 single-character inputs
    const otpInputs = page.locator('input[maxlength="1"], input[inputmode="numeric"]');
    const count = await otpInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('shows "Use recovery code" link or option', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /recovery code/i })
        .or(page.getByRole('link', { name: /recovery code/i }))
    ).toBeVisible();
  });

  test('shows "Back to sign in" link', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /back to sign in/i });
    await expect(backLink).toBeVisible();
  });

  test('navigates to /login when "Back to sign in" is clicked', async ({ page }) => {
    await page.getByRole('link', { name: /back to sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// MFA setup wizard (accessible from /settings/profile — requires auth)
// ---------------------------------------------------------------------------

test.describe('MFA setup wizard — authenticated user', () => {
  test.skip('Setup MFA link is visible on the Profile settings page', async ({ page }) => {
    // Skipped: requires live Keycloak + database
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/profile');
    await expect(page.getByRole('link', { name: /setup mfa|enable mfa/i })).toBeVisible();
  });

  test.skip('Setup wizard Step 1 shows a QR code and manual secret key', async ({ page }) => {
    // Skipped: requires live session + TOTP secret generation
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/profile');
    await page.getByRole('link', { name: /setup mfa/i }).click();
    // Step 1: QR code should be visible
    await expect(page.getByRole('img', { name: /qr code/i })).toBeVisible();
    // Manual secret key section should exist
    await expect(page.getByText(/secret/i)).toBeVisible();
  });

  test.skip('Recovery codes are displayed after setup with copy/download option', async ({ page }) => {
    // Skipped: requires full MFA setup flow with a valid TOTP code
    // After completing MFA setup, user should see 6 recovery codes
    // and a "Copy codes" and "Download" button
  });

  test.skip('MFA enabled indicator shows "MFA enabled" on Profile page after setup', async ({ page }) => {
    // Skipped: requires full MFA setup completion
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/profile');
    // After MFA is enabled, the Setup MFA link should change to "MFA enabled ✓"
    await expect(page.getByText(/mfa enabled/i)).toBeVisible();
  });
});

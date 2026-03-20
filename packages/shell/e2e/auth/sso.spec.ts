/**
 * E2E tests — SSO redirect page (/sso)
 *
 * Tests cover US-011 acceptance criteria for the SSO page UI.
 *
 * Tests that require a live Keycloak identity provider are marked test.skip.
 *
 * Coverage (US-011):
 * - AC-1:  Page loads at /sso with email input
 * - AC-1:  Validate that /sso is publicly accessible (no redirect to /login)
 * - AC-1:  Email field is present and submittable
 * - AC-2:  Form validates email format before submitting
 * - Edge:  Empty email shows validation error
 * - Edge:  Invalid email format shows validation error
 * - Edge:  Page has Back to sign in link pointing to /login
 */

import { test, expect } from '@playwright/test';

test.describe('SSO redirect page', () => {
  // Clear cookies to avoid session interference
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/sso');
  });

  // ---------------------------------------------------------------------------
  // Page load
  // ---------------------------------------------------------------------------

  test('loads at /sso without redirecting to /login', async ({ page }) => {
    await expect(page).toHaveURL(/\/sso/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('has the correct document title', async ({ page }) => {
    await expect(page).toHaveTitle(/Single Sign-On.*Vastu|SSO.*Vastu/i);
  });

  test('shows an email input', async ({ page }) => {
    const emailInput = page.locator('[autocomplete="email"], input[type="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('shows a submit button', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('has a Back to sign in link pointing to /login', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /back to sign in/i });
    await expect(backLink).toBeVisible();
    const href = await backLink.getAttribute('href');
    expect(href).toBe('/login');
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  test('shows error for empty email on blur', async ({ page }) => {
    const emailInput = page.locator('[autocomplete="email"], input[type="email"]').first();
    await emailInput.focus();
    await page.keyboard.press('Tab');
    // Should show a validation error
    await expect(page.getByText(/email.*required|required/i)).toBeVisible();
  });

  test('shows error for invalid email format on blur', async ({ page }) => {
    const emailInput = page.locator('[autocomplete="email"], input[type="email"]').first();
    await emailInput.fill('notanemail');
    await page.keyboard.press('Tab');
    await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Provider lookup requires live Keycloak (skipped)
  // ---------------------------------------------------------------------------

  test.skip('redirects immediately when a single SSO provider is configured', async ({ page }) => {
    // Skipped: requires a Keycloak realm configured with an identity provider.
  });

  test.skip('shows provider selection list when multiple providers are configured', async ({ page }) => {
    // Skipped: requires multiple providers configured in Keycloak.
  });

  test.skip('creates a session and redirects to workspace on successful SSO login', async ({ page }) => {
    // Skipped: requires live Keycloak identity provider and Docker services.
  });
});

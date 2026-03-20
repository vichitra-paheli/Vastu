/**
 * E2E tests — Keycloak OAuth integration
 *
 * These tests exercise the real OAuth round-trip through Keycloak:
 *   Next.js login → Keycloak login page → credential validation → callback → session
 *
 * They run ONLY in the ci-e2e-keycloak workflow which starts a Keycloak
 * container with the vastu realm imported and test users seeded.
 *
 * Coverage:
 * - KC-1: Valid OAuth login creates a session and redirects to /workspace
 * - KC-2: Invalid credentials show an error on the Keycloak login page
 * - KC-3: OAuth callback creates a valid session (middleware allows protected routes)
 * - KC-4: Expired/deleted session redirects to /login on next navigation
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TEST_USERS } from '../fixtures';

// All tests start unauthenticated.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Drive the Keycloak login page: fill credentials and submit.
 *
 * After clicking "Sign in with SSO" on the Next.js login page, the browser
 * redirects to Keycloak at localhost:8080. Keycloak renders its own login form
 * with well-known selectors (#username, #password, #kc-login).
 */
async function fillKeycloakLoginForm(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  // Wait for the Keycloak login form to appear.
  await page.waitForSelector('#kc-form-login', { timeout: 15_000 });
  await page.fill('#username', email);
  await page.fill('#password', password);
  await page.click('#kc-login');
}

// ---------------------------------------------------------------------------
// KC-1: Valid OAuth login
// ---------------------------------------------------------------------------

test.describe('Keycloak OAuth — valid login', () => {
  test('admin user can log in via Keycloak and land on /workspace', async ({ page }) => {
    await page.goto('/login');

    // Click the SSO button which calls signIn('keycloak').
    await page.locator(SELECTORS.login.ssoButton).click();

    // Fill credentials on the Keycloak login page.
    await fillKeycloakLoginForm(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // After successful auth, Keycloak redirects back to the callback URL,
    // next-auth creates a session, and the user lands on /workspace.
    await expect(page).toHaveURL(/\/workspace/, { timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// KC-2: Invalid credentials
// ---------------------------------------------------------------------------

test.describe('Keycloak OAuth — invalid credentials', () => {
  test('wrong password shows an error on the Keycloak login page', async ({ page }) => {
    await page.goto('/login');
    await page.locator(SELECTORS.login.ssoButton).click();

    // Fill wrong credentials on the Keycloak login page.
    await fillKeycloakLoginForm(page, TEST_USERS.admin.email, 'WrongPassword123!');

    // Keycloak stays on its login page and shows an error.
    // The error message container has id="input-error" or class="alert-error".
    await expect(
      page.locator('#input-error, .alert-error, [class*="kc-feedback-text"]'),
    ).toBeVisible({ timeout: 10_000 });

    // Should still be on the Keycloak domain, NOT redirected back.
    expect(page.url()).toContain(':8080');
  });

  test('non-existent user shows an error on the Keycloak login page', async ({ page }) => {
    await page.goto('/login');
    await page.locator(SELECTORS.login.ssoButton).click();

    await fillKeycloakLoginForm(page, 'nobody@example.com', 'SomePassword1!');

    await expect(
      page.locator('#input-error, .alert-error, [class*="kc-feedback-text"]'),
    ).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain(':8080');
  });
});

// ---------------------------------------------------------------------------
// KC-3: OAuth callback creates a valid session
// ---------------------------------------------------------------------------

test.describe('Keycloak OAuth — session validity', () => {
  test('after OAuth login, middleware allows access to protected routes', async ({ page }) => {
    // Log in via OAuth.
    await page.goto('/login');
    await page.locator(SELECTORS.login.ssoButton).click();
    await fillKeycloakLoginForm(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL(/\/workspace/, { timeout: 15_000 });

    // Navigate to a protected admin page — should NOT redirect to /login.
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// KC-4: Session expiry → redirect to /login
// ---------------------------------------------------------------------------

test.describe('Keycloak OAuth — session expiry', () => {
  test('clearing session cookie redirects the user to /login', async ({ page, context }) => {
    // Log in via OAuth to establish a real session.
    await page.goto('/login');
    await page.locator(SELECTORS.login.ssoButton).click();
    await fillKeycloakLoginForm(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL(/\/workspace/, { timeout: 15_000 });

    // Clear the session cookie to simulate expiry.
    // Middleware checks for cookie presence — without it, protected routes
    // redirect to /login.
    await context.clearCookies();

    // Navigate to a protected route — middleware should redirect to /login.
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

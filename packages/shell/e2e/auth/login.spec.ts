/**
 * E2E tests — Login page (/login)
 *
 * These tests verify the UI rendering and client-side behaviour of the login
 * page WITHOUT requiring Keycloak or Docker services to be running.
 *
 * Tests that exercise the actual authentication flow (credential submission
 * that results in a session) are marked with test.skip and an explanation,
 * because they require Keycloak running via `docker compose up -d`.
 *
 * Coverage (US-006):
 * - AC-1:  Page loads with correct title
 * - AC-2:  Email and password fields are present
 * - AC-2:  Validation errors for empty fields
 * - AC-3:  SSO button is present
 * - AC-4:  "Forgot password?" link navigates to /forgot-password
 * - AC-5:  "Create account" link navigates to /register
 * - AC-7:  Generic error message on bad credentials (skipped — needs Keycloak)
 * - AC-8:  Session created on success (skipped — needs Keycloak)
 */

import { test, expect } from '@playwright/test';
import { SELECTORS } from '../fixtures';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // -------------------------------------------------------------------------
  // Page load
  // -------------------------------------------------------------------------

  test('has the correct document title', async ({ page }) => {
    await expect(page).toHaveTitle(/Sign In.*Vastu/i);
  });

  test('shows the "Welcome back" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Form fields
  // -------------------------------------------------------------------------

  test('renders an email input', async ({ page }) => {
    const email = page.locator(SELECTORS.login.emailInput);
    await expect(email).toBeVisible();
    await expect(email).toHaveAttribute('type', 'email');
  });

  test('renders a password input', async ({ page }) => {
    // Mantine PasswordInput renders its internal input inside the wrapper;
    // we locate by autocomplete attribute for resilience.
    const password = page.locator(SELECTORS.login.passwordInput);
    await expect(password).toBeVisible();
  });

  test('renders a Sign in submit button', async ({ page }) => {
    const submit = page.locator(SELECTORS.login.submitButton);
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // Validation — empty submit
  // -------------------------------------------------------------------------

  test('shows validation error for empty email field on blur', async ({ page }) => {
    // Tab into and out of the email field without entering anything.
    await page.locator(SELECTORS.login.emailInput).focus();
    await page.keyboard.press('Tab');
    // Mantine renders the error text beneath the input.
    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('shows validation error for empty password field on blur', async ({ page }) => {
    await page.locator(SELECTORS.login.passwordInput).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('shows validation error for invalid email format on blur', async ({ page }) => {
    await page.locator(SELECTORS.login.emailInput).fill('notanemail');
    await page.keyboard.press('Tab');
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('does not show an error alert on initial load', async ({ page }) => {
    await expect(page.locator(SELECTORS.login.errorAlert)).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // SSO
  // -------------------------------------------------------------------------

  test('renders the SSO sign-in button', async ({ page }) => {
    const ssoBtn = page.locator(SELECTORS.login.ssoButton);
    await expect(ssoBtn).toBeVisible();
    await expect(ssoBtn).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // Navigation links
  // -------------------------------------------------------------------------

  test('has a "Forgot password?" link pointing to /forgot-password', async ({ page }) => {
    const link = page.locator(SELECTORS.login.forgotPasswordLink);
    await expect(link).toBeVisible();
    await expect(link).toHaveText(/forgot password/i);
  });

  test('navigates to /forgot-password when "Forgot password?" is clicked', async ({ page }) => {
    await page.locator(SELECTORS.login.forgotPasswordLink).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('has a "Create account" link pointing to /register', async ({ page }) => {
    const link = page.locator(SELECTORS.login.createAccountLink);
    await expect(link).toBeVisible();
  });

  test('navigates to /register when the "Create account" link is clicked', async ({ page }) => {
    await page.locator(SELECTORS.login.createAccountLink).click();
    await expect(page).toHaveURL(/\/register/);
  });

  // -------------------------------------------------------------------------
  // Full auth flow — requires Keycloak (Docker)
  // -------------------------------------------------------------------------

  test.skip('shows an error message for invalid credentials', async ({ page }) => {
    // Skipped: requires Keycloak running via `docker compose up -d`.
    // When Keycloak is available, fill the form with wrong credentials and
    // assert that the generic "Invalid email or password" alert appears.
    await page.locator(SELECTORS.login.emailInput).fill('wrong@example.com');
    await page.locator(SELECTORS.login.passwordInput).fill('wrongpassword');
    await page.locator(SELECTORS.login.submitButton).click();
    await expect(page.locator(SELECTORS.login.errorAlert)).toBeVisible();
    await expect(page.locator(SELECTORS.login.errorAlert)).toContainText(
      'Invalid email or password',
    );
  });

  test.skip('redirects to /workspace on successful login', async ({ page }) => {
    // Skipped: requires Keycloak running via `docker compose up -d`.
    // When Keycloak is available, sign in with seed user admin@vastu.dev
    // and assert that the page lands on /workspace.
    await page.locator(SELECTORS.login.emailInput).fill('admin@vastu.dev');
    await page.locator(SELECTORS.login.passwordInput).fill('Admin1234!');
    await page.locator(SELECTORS.login.submitButton).click();
    await expect(page).toHaveURL(/\/workspace/);
  });
});

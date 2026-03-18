/**
 * E2E tests — Registration page (/register)
 *
 * These tests verify the UI rendering and client-side behaviour of the
 * registration page WITHOUT requiring Keycloak, Docker, or a live database.
 *
 * Tests that exercise the actual registration API call (POST /api/auth/register)
 * are marked with test.skip and an explanation, because they require a running
 * Postgres instance and email delivery service.
 *
 * Coverage (US-007):
 * - AC-1:  Page loads with correct title
 * - AC-2:  All required fields are present (name, org, email, password, confirm, terms)
 * - AC-3:  Password strength bar appears when typing a password
 * - AC-8:  "Already have an account? Sign in" link navigates to /login
 */

import { test, expect } from '@playwright/test';
import { SELECTORS } from '../fixtures';

test.describe('Registration page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  // -------------------------------------------------------------------------
  // Page load
  // -------------------------------------------------------------------------

  test('has the correct document title', async ({ page }) => {
    await expect(page).toHaveTitle(/Create Account.*Vastu/i);
  });

  test('shows the "Create your account" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Form fields
  // -------------------------------------------------------------------------

  test('renders the full name input', async ({ page }) => {
    const input = page.locator(SELECTORS.register.nameInput);
    await expect(input).toBeVisible();
  });

  test('renders the organization name input', async ({ page }) => {
    const input = page.locator(SELECTORS.register.orgNameInput);
    await expect(input).toBeVisible();
  });

  test('renders the work email input', async ({ page }) => {
    const input = page.locator(SELECTORS.register.emailInput);
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'email');
  });

  test('renders the password input', async ({ page }) => {
    // The first [autocomplete="new-password"] is the password field;
    // the second is the confirm-password field.
    const inputs = page.locator(SELECTORS.register.passwordInput);
    await expect(inputs).toHaveCount(2);
  });

  test('renders the terms checkbox', async ({ page }) => {
    const checkbox = page.getByRole('checkbox');
    await expect(checkbox).toBeVisible();
  });

  test('renders the Create account submit button', async ({ page }) => {
    const btn = page.locator(SELECTORS.register.submitButton);
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // Password strength bar
  // -------------------------------------------------------------------------

  test('password strength bar is hidden when password is empty', async ({ page }) => {
    // PasswordStrengthBar renders null when password is empty.
    await expect(page.locator(SELECTORS.register.passwordStrengthLabel)).not.toBeVisible();
  });

  test('password strength bar appears when typing in the password field', async ({ page }) => {
    // Type into the first new-password input (the main password field).
    const passwordInput = page.locator(SELECTORS.register.passwordInput).first();
    await passwordInput.fill('weak');

    // The strength label becomes visible with an aria-live polite announcement.
    const strengthLabel = page.locator(SELECTORS.register.passwordStrengthLabel);
    await expect(strengthLabel).toBeVisible();
  });

  test('shows "Weak" for a short single-case password', async ({ page }) => {
    const passwordInput = page.locator(SELECTORS.register.passwordInput).first();
    await passwordInput.fill('abc');

    await expect(page.locator(SELECTORS.register.passwordStrengthLabel)).toHaveText('Weak');
  });

  test('shows "Strong" for a complex password meeting all criteria', async ({ page }) => {
    const passwordInput = page.locator(SELECTORS.register.passwordInput).first();
    // Length >=12, mixed case, digit, special character → score 5 → strong
    await passwordInput.fill('MyP@ssword1234!');

    await expect(page.locator(SELECTORS.register.passwordStrengthLabel)).toHaveText('Strong');
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  test('shows validation error for empty full name on blur', async ({ page }) => {
    await page.locator(SELECTORS.register.nameInput).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByText('Full name is required')).toBeVisible();
  });

  test('shows validation error for empty organization name on blur', async ({ page }) => {
    await page.locator(SELECTORS.register.orgNameInput).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByText('Organization name is required')).toBeVisible();
  });

  test('shows validation error for invalid email format on blur', async ({ page }) => {
    await page.locator(SELECTORS.register.emailInput).fill('not-an-email');
    await page.keyboard.press('Tab');
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('shows validation error when password is too short on blur', async ({ page }) => {
    const passwordInput = page.locator(SELECTORS.register.passwordInput).first();
    await passwordInput.fill('short');
    await page.keyboard.press('Tab');
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('shows validation error when passwords do not match', async ({ page }) => {
    const inputs = page.locator(SELECTORS.register.passwordInput);
    await inputs.first().fill('Password1!');
    await inputs.nth(1).fill('Different1!');
    await page.keyboard.press('Tab');
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Navigation links
  // -------------------------------------------------------------------------

  test('has a "Sign in" link pointing to /login', async ({ page }) => {
    const link = page.locator(SELECTORS.register.signInLink);
    await expect(link).toBeVisible();
  });

  test('navigates to /login when "Sign in" is clicked', async ({ page }) => {
    await page.locator(SELECTORS.register.signInLink).click();
    await expect(page).toHaveURL(/\/login/);
  });

  // -------------------------------------------------------------------------
  // Full registration flow — requires database + email service
  // -------------------------------------------------------------------------

  test.skip('creates an account and redirects to /verify-email on valid submission', async ({
    page,
  }) => {
    // Skipped: requires a running Postgres database and the Next.js API routes
    // to be connected to it. When available:
    // 1. Fill the form with valid unique data
    // 2. Submit
    // 3. Assert redirect to /verify-email?email=...
    await page.locator(SELECTORS.register.nameInput).fill('Test User');
    await page.locator(SELECTORS.register.orgNameInput).fill('Test Org');
    await page.locator(SELECTORS.register.emailInput).fill(`test+${Date.now()}@example.com`);

    const inputs = page.locator(SELECTORS.register.passwordInput);
    await inputs.first().fill('SecurePass1!');
    await inputs.nth(1).fill('SecurePass1!');

    await page.getByRole('checkbox').click();
    await page.locator(SELECTORS.register.submitButton).click();

    await expect(page).toHaveURL(/\/verify-email/);
  });

  test.skip('shows an error when email is already taken', async ({ page }) => {
    // Skipped: requires a running Postgres database with the seed user present.
    await page.locator(SELECTORS.register.nameInput).fill('Admin User');
    await page.locator(SELECTORS.register.orgNameInput).fill('Existing Org');
    await page.locator(SELECTORS.register.emailInput).fill('admin@vastu.dev');

    const inputs = page.locator(SELECTORS.register.passwordInput);
    await inputs.first().fill('Admin1234!');
    await inputs.nth(1).fill('Admin1234!');

    await page.getByRole('checkbox').click();
    await page.locator(SELECTORS.register.submitButton).click();

    await expect(page.locator(SELECTORS.register.errorAlert)).toBeVisible();
    await expect(page.locator(SELECTORS.register.errorAlert)).toContainText(
      'An account with this email address already exists',
    );
  });
});

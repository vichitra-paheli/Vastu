/**
 * E2E test fixtures and helpers for the shell package.
 *
 * Provides:
 * - Pre-configured test user credentials (matching seed data in packages/shared/prisma/seed.ts)
 * - `loginAs` helper for authenticating a Playwright page
 * - Common selectors for auth page elements
 *
 * Note: `loginAs` performs a real Keycloak authentication flow. It requires
 * Docker services running (`docker compose up -d`). Tests that call `loginAs`
 * must be marked with `test.skip` when Docker is unavailable (e.g., unit CI).
 */

import { type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Seed users — must match packages/shared/prisma/seed.ts
// ---------------------------------------------------------------------------

export const TEST_USERS = {
  admin: {
    email: 'admin@vastu.dev',
    password: 'Admin1234!',
    name: 'Admin User',
    role: 'Admin',
  },
  editor: {
    email: 'editor@vastu.dev',
    password: 'Editor1234!',
    name: 'Editor User',
    role: 'Editor',
  },
  viewer: {
    email: 'viewer@vastu.dev',
    password: 'Viewer1234!',
    name: 'Viewer User',
    role: 'Viewer',
  },
} as const;

// ---------------------------------------------------------------------------
// Common selectors
// ---------------------------------------------------------------------------

/**
 * CSS / role selectors for auth page elements.
 * Using accessible roles and labels keeps tests resilient to minor HTML changes.
 */
export const SELECTORS = {
  // Login page
  login: {
    emailInput: '[autocomplete="email"]',
    passwordInput: '[autocomplete="current-password"]',
    submitButton: 'button[type="submit"]',
    ssoButton: 'button:has-text("Sign in with SSO")',
    forgotPasswordLink: 'a[href="/forgot-password"]',
    createAccountLink: 'a[href="/register"]',
    errorAlert: '[role="alert"]',
  },

  // Registration page
  register: {
    nameInput: '[autocomplete="name"]',
    orgNameInput: '[autocomplete="organization"]',
    emailInput: '[autocomplete="email"]',
    passwordInput: '[autocomplete="new-password"]',
    submitButton: 'button[type="submit"]',
    signInLink: 'a[href="/login"]',
    errorAlert: '[role="alert"]',
    // Password strength bar — identified by its aria-live label
    passwordStrengthLabel: '[aria-live="polite"]',
  },

  // Forgot-password page
  forgotPassword: {
    emailInput: '[autocomplete="email"]',
    submitButton: 'button[type="submit"]',
    backToSignInLink: 'a[href="/login"]',
    errorAlert: '[role="alert"]',
    successAlert: '[role="status"]',
  },

  // Reset-password page
  resetPassword: {
    passwordInput: '[autocomplete="new-password"]',
    submitButton: 'button[type="submit"]',
    backToSignInLink: 'a[href="/login"]',
    errorAlert: '[role="alert"]',
  },
} as const;

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

/**
 * Signs in as the given user via the login form.
 *
 * IMPORTANT: This helper requires a running Next.js server AND Keycloak.
 * Tests using this helper must be skipped when Docker services are unavailable.
 *
 * On success the page will be at /workspace (or the redirectUrl you pass).
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
  redirectUrl = '/workspace',
): Promise<void> {
  await page.goto('/login');
  await page.fill(SELECTORS.login.emailInput, email);
  await page.fill(SELECTORS.login.passwordInput, password);
  await page.click(SELECTORS.login.submitButton);
  await page.waitForURL(redirectUrl, { timeout: 15_000 });
}

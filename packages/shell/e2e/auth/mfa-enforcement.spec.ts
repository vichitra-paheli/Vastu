/**
 * E2E tests — MFA enforcement redirect (US-102, AC-3)
 *
 * These tests verify that when an organization has mfa_required=true and a user
 * hasn't configured MFA, they are redirected to /mfa after navigating to a
 * protected route.
 *
 * Most tests here exercise the UI-level behaviour without a live database.
 * Tests that require a live auth session + Keycloak + real DB are marked skip.
 *
 * Coverage (US-102):
 * - AC-3: Redirect to /mfa when mfa_required=true and user has no MFA (skipped — needs live session)
 * - AC-5: Existing sso_required behaviour unchanged (verified by existing SSO tests)
 *
 * The MFA setup page itself is already tested in mfa-setup.spec.ts.
 * The SSO toggle behaviour is tested in settings tests.
 */

import { test, expect } from '@playwright/test';

test.describe('MFA enforcement redirect (US-102)', () => {
  // -------------------------------------------------------------------------
  // The /mfa page is publicly accessible
  // -------------------------------------------------------------------------

  test('the /mfa page is accessible without authentication', async ({ page }) => {
    await page.goto('/mfa');
    // Should render the MFA challenge/setup page, not redirect to /login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('the /mfa page renders the two-factor authentication heading', async ({ page }) => {
    await page.goto('/mfa');
    await expect(
      page.getByRole('heading', { name: /two-factor authentication/i }),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // MFA enforcement — live session required
  // -------------------------------------------------------------------------

  test.skip(
    'redirects to /mfa when org has mfa_required=true and user has no MFA configured',
    async ({ page }) => {
      // Skipped: requires a live database with mfa_required=true on the
      // organization AND a user with mfa_enabled=false.
      //
      // Setup steps when Keycloak + DB are available:
      // 1. Seed an org with mfa_required = true
      // 2. Sign in as a user in that org with mfa_enabled = false
      // 3. Navigate to /workspace (or any protected route)
      // 4. Assert redirect to /mfa
      //
      // Example (adjust for actual seed data):
      //   await page.goto('/api/auth/signin/credentials');
      //   // ... fill form and submit ...
      //   await page.goto('/workspace');
      //   await expect(page).toHaveURL(/\/mfa/);
    },
  );

  test.skip(
    'allows access to /workspace after MFA is configured even if org has mfa_required=true',
    async ({ page }) => {
      // Skipped: requires a live database session with a user that has
      // mfa_enabled = true and org mfa_required = true.
      //
      // When available:
      // 1. Sign in as a user with mfa_enabled = true in an org with mfa_required = true
      // 2. Navigate to /workspace
      // 3. Assert NO redirect to /mfa — access is granted directly
    },
  );

  test.skip(
    'does not redirect to /mfa when org has mfa_required=false even if user has no MFA',
    async ({ page }) => {
      // Skipped: requires a live database session with a user that has
      // mfa_enabled = false in an org with mfa_required = false.
      //
      // When available:
      // 1. Sign in as a user with mfa_enabled = false in an org with mfa_required = false
      // 2. Navigate to /workspace
      // 3. Assert NO redirect to /mfa
    },
  );

  test.skip(
    'sso_required=true continues to work independently of mfa_required',
    async ({ page }) => {
      // Skipped: requires a live database session.
      // Verifies AC-5: existing sso_required behaviour is unchanged by mfa_required.
      //
      // When available:
      // 1. Sign in via SSO in an org with sso_required=true and mfa_required=false
      // 2. Navigate to /workspace
      // 3. Assert user reaches workspace without MFA prompt
    },
  );
});

// ---------------------------------------------------------------------------
// SSO config page — two separate toggles (US-102 AC-2, AC-4)
// ---------------------------------------------------------------------------

test.describe('SSO config page — enforcement toggles (US-102)', () => {
  test.skip('shows two separate enforcement toggles on the SSO settings page', async ({ page }) => {
    // Skipped: requires an authenticated admin session.
    //
    // When available:
    // 1. Sign in as admin
    // 2. Navigate to /settings/sso
    // 3. Assert "Require SSO for all users" checkbox is present
    // 4. Assert "Require MFA for all users" checkbox is present
    // 5. Assert both can be independently toggled
  });

  test.skip('SSO and MFA toggles can be independently enabled and disabled', async ({ page }) => {
    // Skipped: requires an authenticated admin session with API access.
    //
    // When available:
    // 1. Sign in as admin
    // 2. Enable SSO enforcement, leave MFA enforcement disabled
    // 3. Verify org.ssoRequired=true, org.mfaRequired=false in DB
    // 4. Enable MFA enforcement
    // 5. Verify org.ssoRequired=true, org.mfaRequired=true in DB
    // 6. Disable SSO enforcement
    // 7. Verify org.ssoRequired=false, org.mfaRequired=true in DB
  });
});

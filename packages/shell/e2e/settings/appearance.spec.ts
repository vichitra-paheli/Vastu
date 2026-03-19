/**
 * E2E tests — Appearance settings page (/settings/appearance)
 *
 * Tests cover US-018 acceptance criteria.
 *
 * Tests that require an authenticated session are skipped.
 *
 * Coverage (US-018):
 * - Unauthenticated redirect
 * - Happy path: page loads with color scheme, accent, density controls
 * - Happy path: segmented control changes apply immediately (no save button)
 * - Happy path: accent color swatch row is present
 * - Happy path: custom hex input field is present
 * - Edge: invalid hex color is rejected
 * - Permission: any authenticated user can access appearance settings
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

test.describe('Appearance settings — unauthenticated', () => {
  test('redirects /settings/appearance to /login', async ({ page }) => {
    await page.goto('/settings/appearance');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Appearance settings — authenticated user', () => {
  test.skip('page is accessible at /settings/appearance for any role', async ({ page }) => {
    // Skipped: requires live Keycloak.
    await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    await page.goto('/settings/appearance');
    await expect(page).toHaveURL(/\/settings\/appearance/);
  });

  test.skip('shows color scheme segmented control with Light/Dark/System options', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/appearance');
    // Segmented control should have all three options
    await expect(page.getByRole('radio', { name: /light/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /dark/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /system/i })).toBeVisible();
  });

  test.skip('shows accent color swatch row with at least 6 presets', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/appearance');
    // At least 6 color swatch buttons should be visible
    const swatches = page.getByRole('button', { name: /indigo|steel blue|teal|orange|red|purple/i });
    expect(await swatches.count()).toBeGreaterThanOrEqual(6);
  });

  test.skip('shows density segmented control with Compact/Comfortable/Spacious options', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/appearance');
    await expect(page.getByRole('radio', { name: /compact/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /comfortable/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /spacious/i })).toBeVisible();
  });

  test.skip('there is no explicit Save button (auto-save on change)', async ({ page }) => {
    // Appearance settings should auto-save per US-018 AC-6
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/appearance');
    // There should be no "Save" button
    await expect(page.getByRole('button', { name: /^save$/i })).not.toBeVisible();
  });

  test.skip('clicking a color swatch triggers an auto-save and shows Saved indicator', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/appearance');
    await page.getByRole('button', { name: /teal/i }).click();
    // A "Saved" indicator should briefly appear
    await expect(page.getByText(/saved/i)).toBeVisible();
  });

  test.skip('custom hex input rejects non-hex values', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/appearance');
    // Find the hex input and type an invalid value
    const hexInput = page.getByPlaceholder(/#[0-9A-Fa-f]/);
    await hexInput.clear();
    await hexInput.type('notahex');
    // Input should not trigger save / should show an error or be ignored
    await page.getByRole('radio', { name: /light/i }).click(); // blur the input
    // The invalid value should not have caused an API call with invalid data
    // Saved indicator should NOT appear for invalid hex
    await expect(page.getByText(/saved/i)).not.toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

test.describe('Dashboard view - auth protection', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/login/);
  });
});

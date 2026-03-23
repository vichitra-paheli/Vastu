/**
 * E2E tests — Dashboard view (US-127)
 *
 * Auth protection for /workspace is covered by workspace.spec.ts
 * (canonical auth-protection tests live there, not duplicated here).
 *
 * Dashboard-specific tests will be added here when dashboard view
 * functionality is implemented.
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';
import { WorkspacePage } from './fixtures/workspace-page';

test.describe('Dashboard view', () => {
  test.skip('dashboard panel renders after login', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');

    await expect(page.getByTestId('dashboard-panel')).toBeVisible({ timeout: 8_000 });
  });
});

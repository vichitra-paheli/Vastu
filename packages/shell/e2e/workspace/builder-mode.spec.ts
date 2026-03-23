/**
 * E2E tests - Builder mode config panel (US-136)
 * PR: https://github.com/vichitra-paheli/Vastu/pull/304
 */
// Auth protection for /workspace is covered by workspace.spec.ts — not duplicated here.

import { test, expect } from "@playwright/test";
import { loginAs, TEST_USERS } from "../fixtures";

// AC-1: Builder mode replaces panel content

test.describe("Builder mode - AC-1: builder replaces panel content", () => {
  test.skip("admin: switching to builder mode shows builder panel", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await expect(page.getByTestId("builder-panel")).toBeVisible({ timeout: 5_000 });
  });

  test.skip("switching back from builder restores original panel content", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await expect(page.getByTestId("builder-panel")).toBeVisible();
    await page.getByRole("radio", { name: /editor/i }).click();
    await expect(page.getByTestId("builder-panel")).not.toBeVisible();
  });
});

// AC-2: Section navigation

test.describe("Builder mode - AC-2: section navigation", () => {
  test.skip("all 8 nav sections are present", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    const nav = page.getByRole("navigation", { name: /builder section navigation/i });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("button")).toHaveCount(8);
  });

  test.skip("clicking Field configuration shows fieldconfig section", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await page.getByRole("button", { name: /field configuration/i }).click();
    await expect(page.getByTestId("builder-fieldconfig-section")).toBeVisible();
  });

  test.skip("clicking Permissions shows permissions section", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await page.getByRole("button", { name: /^permissions$/i }).click();
    await expect(page.getByTestId("builder-permissions-section")).toBeVisible();
  });

  test.skip("data source section shown by default", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await expect(page.getByTestId("builder-datasource-section")).toBeVisible();
  });
});

// AC-3: Warning header

test.describe("Builder mode - AC-3: warning header", () => {
  test.skip("warning header shows page configuration message", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await expect(page.getByText(/Page configuration/)).toBeVisible();
  });

  test.skip("discard button is disabled when no changes made", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await expect(page.getByRole("button", { name: /discard/i })).toBeDisabled();
  });
});

// RBAC: Viewers and editors cannot access builder mode

test.describe("Builder mode - RBAC permissions", () => {
  test.skip("editor: builder mode tab is not shown in ModeSwitch", async ({ page }) => {
    // Editors lack ability.can("configure", "Page") - builder tab hidden
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.editor.email, TEST_USERS.editor.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await expect(page.getByRole("radio", { name: /builder/i })).not.toBeVisible();
  });

  test.skip("viewer: builder mode tab is not shown in ModeSwitch", async ({ page }) => {
    // Viewers lack ability.can("configure", "Page") - builder tab hidden
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await expect(page.getByRole("radio", { name: /builder/i })).not.toBeVisible();
  });
});

// AC-4: Data source section

test.describe("Builder mode - AC-4: data source section", () => {
  test.skip("data source section shows connection picker", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    const ds = page.getByTestId("builder-datasource-section");
    await expect(ds).toBeVisible();
    await expect(ds.getByLabel(/db connection/i)).toBeVisible();
  });

  test.skip("selecting a connection reveals table picker", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    const ds = page.getByTestId("builder-datasource-section");
    await ds.getByLabel(/db connection/i).selectOption("conn-main");
    await expect(ds.getByLabel(/table/i)).toBeVisible();
  });

  test.skip("selecting table reveals schema preview", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    const ds = page.getByTestId("builder-datasource-section");
    await ds.getByLabel(/db connection/i).selectOption("conn-main");
    await ds.getByLabel(/table/i).selectOption("users");
    await expect(ds.getByText(/Schema preview/)).toBeVisible();
  });
});

// AC-8: Permissions section

test.describe("Builder mode - AC-8: permissions section", () => {
  test.skip("shows role x action matrix with all 4 roles", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await page.getByRole("button", { name: /^permissions$/i }).click();
    const section = page.getByTestId("builder-permissions-section");
    await expect(section.getByText("admin")).toBeVisible();
    await expect(section.getByText("viewer")).toBeVisible();
    await expect(section.getByText("View")).toBeVisible();
    await expect(section.getByText("Delete")).toBeVisible();
  });
});

// AC-12: Config persistence

test.describe("Builder mode - AC-12: config persistence", () => {
  test.skip("making a change enables the discard button", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    const discardBtn = page.getByRole("button", { name: /discard/i });
    await expect(discardBtn).toBeDisabled();
    await page.getByRole("button", { name: /page metadata/i }).click();
    await page.getByLabel(/page name/i).fill("Modified Name");
    await page.getByLabel(/page name/i).blur();
    await expect(discardBtn).not.toBeDisabled();
  });

  test.skip("draft survives switching sections", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await page.getByRole("button", { name: /page metadata/i }).click();
    await page.getByLabel(/page name/i).fill("Persisted Draft");
    await page.getByLabel(/page name/i).blur();
    await page.getByRole("button", { name: /permissions/i }).click();
    await page.getByRole("button", { name: /page metadata/i }).click();
    await expect(page.getByLabel(/page name/i)).toHaveValue("Persisted Draft");
  });

  test.skip("save config calls PUT API and clears dirty state", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await page.getByRole("button", { name: /page metadata/i }).click();
    await page.getByLabel(/page name/i).fill("Saved Name");
    await page.getByLabel(/page name/i).blur();
    const apiPromise = page.waitForRequest(
      (req) => req.url().includes("/api/workspace/pages/") && req.method() === "PUT",
    );
    await page.getByRole("button", { name: /save page configuration/i }).click();
    await apiPromise;
    await expect(page.getByRole("button", { name: /discard/i })).toBeDisabled({ timeout: 5_000 });
  });
});

// Keyboard navigation

test.describe("Builder mode - keyboard navigation", () => {
  test.skip("can tab through all 8 section nav buttons", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    const nav = page.getByRole("navigation", { name: /builder section navigation/i });
    await nav.getByRole("button").first().focus();
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press("Tab");
    }
    await expect(page.locator(":focus")).toBeVisible();
  });

  test.skip("pressing Enter on a nav button activates that section", async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/workspace");
    const ms = page.getByRole("radiogroup", { name: /mode/i }).first();
    await ms.waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("radio", { name: /builder/i }).click();
    await page.getByRole("button", { name: /field configuration/i }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("builder-fieldconfig-section")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { openApp } from "../app-context";

test.describe("Approvals center", () => {
  test("filters by status and type, updates export link", async ({ page }) => {
    const app = await openApp(page, "/en/approvals");

    await expect(app.getByRole("heading", { name: "Approvals" })).toBeVisible();

    await app.locator('[data-testid="approval-status-filter"]').click();
    await app.getByRole("option", { name: "待审批" }).click();

    await app.locator('[data-testid="approval-type-filter"]').click();
    await app.getByRole("option", { name: "Inbound" }).click();

    await expect(app.getByText("#APR-002")).toBeVisible();
    await expect(app.getByText("#APR-001")).toHaveCount(0);

    await expect(app.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      /status=pending/,
    );
  });

  test("opens approval detail from the list", async ({ page }) => {
    const app = await openApp(page, "/en/approvals");

    const targetRow = app.locator("tr", { hasText: "#APR-001" });
    await targetRow.getByRole("link").first().click();

    await expect(app.getByRole("heading", { name: "Approval Detail" })).toBeVisible();
    await expect(app.getByText("#APR-001")).toBeVisible();
  });
});



import { test, expect } from "@playwright/test";
import { openApp } from "../app-context";

test.describe("System console", () => {
  test("navigates from overview to approval config", async ({ page }) => {
    const app = await openApp(page, "/en/system");

    await expect(app.getByRole("heading", { name: "System Console" })).toBeVisible();

    await app.getByRole("link", { name: /Approval Config/ }).click();

    await expect(
      app.getByRole("heading", { name: "Approval Configuration" }),
    ).toBeVisible();

    const purchaseCard = app.locator('[data-testid="action-config-card-purchase"]');
    await expect(purchaseCard).toBeVisible();
    await expect(purchaseCard.getByRole("button", { name: /Save/ })).toBeVisible();
  });
});



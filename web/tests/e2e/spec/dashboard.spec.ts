import { expect, test } from "@playwright/test";
import { openApp } from "../app-context";

test.describe("Dashboard overview", () => {
  test("supports range filter and shortcuts navigation", async ({ page }) => {
    const app = await openApp(page, "/en");

    await expect(
      app.getByRole("heading", { name: "Asset Lifecycle Overview" }),
    ).toBeVisible();

    const rangeFilter = app.getByTestId("dashboard-range-filter");
    await expect(rangeFilter).toBeVisible();

    await rangeFilter.getByRole("button", { name: "Last 30 days" }).click();

    await expect.poll(async () => {
      return app
        .locator("body")
        .evaluate(() => window.location.search)
        .catch(() => "");
    }).toContain("range=30");

    const shortcuts = app.getByTestId("dashboard-shortcuts").getByRole("link");
    await expect(shortcuts).toHaveCount(4);

    await app.getByRole("link", { name: "Asset List" }).click();
    await expect(app.getByRole("heading", { name: "Asset List" })).toBeVisible();
  });
});



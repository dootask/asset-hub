import { test, expect } from "@playwright/test";
import { openApp } from "../app-context";

test.describe("Dashboard overview", () => {
  test("renders summary cards and navigates via shortcuts", async ({ page }) => {
    const app = await openApp(page, "/en");

    await expect(
      app.getByRole("heading", { name: "Asset Lifecycle Overview" }),
    ).toBeVisible();

    const cards = app.locator("section").first().getByRole("link");
    await expect(cards).toHaveCount(4);

    await app.getByRole("link", { name: "Asset List" }).click();
    await expect(app.getByRole("heading", { name: "Asset List" })).toBeVisible();
  });
});



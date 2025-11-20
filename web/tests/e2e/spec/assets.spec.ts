import { test, expect } from "@playwright/test";
import { openApp } from "../app-context";
import { createTestAsset } from "../test-data";

test.describe("Asset list filters", () => {
  test("filters assets by keyword", async ({ page }) => {
    const keyword = `Mac-${Date.now()}`;
    const matchingAsset = await createTestAsset(page.request, {
      name: `E2E ${keyword} Laptop`,
    });
    const otherAsset = await createTestAsset(page.request, {
      name: `E2E Server ${Date.now()}`,
      category: "Server",
    });

    const app = await openApp(page, "/en/assets/list");

    await expect(app.getByRole("heading", { name: "Asset List" })).toBeVisible();

    const searchInput = app.getByLabel("Keyword");
    await searchInput.fill(keyword);
    await app.getByRole("button", { name: "Apply" }).click();

    await expect(app.getByRole("link", { name: matchingAsset.name })).toBeVisible();
    await expect(app.getByRole("link", { name: otherAsset.name })).toHaveCount(0);

    await app.getByRole("button", { name: "Reset" }).click();
    await expect(app.getByRole("link", { name: otherAsset.name })).toBeVisible();
    await expect(app.getByRole("link", { name: matchingAsset.name })).toBeVisible();
  });
});


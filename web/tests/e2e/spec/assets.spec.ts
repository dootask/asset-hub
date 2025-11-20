import { test, expect } from "@playwright/test";
import { openApp } from "../app-context";

test.describe("Asset list filters", () => {
  test("filters assets by keyword", async ({ page }) => {
    const app = await openApp(page, "/en/assets/list");

    await expect(app.getByRole("heading", { name: "Asset List" })).toBeVisible();

    const searchInput = app.getByLabel("Keyword");
    await searchInput.fill("MacBook");
    await app.getByRole("button", { name: "Apply" }).click();

    await expect(app.getByRole("link", { name: /MacBook Pro 16/ })).toBeVisible();
    await expect(app.getByRole("link", { name: /Dell PowerEdge R760/ })).toHaveCount(
      0,
    );

    await app.getByRole("button", { name: "Reset" }).click();
    await expect(app.getByRole("link", { name: /Dell PowerEdge R760/ })).toBeVisible();
  });
});



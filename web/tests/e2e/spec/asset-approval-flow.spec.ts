import { test, expect } from "@playwright/test";
import { openApp } from "../app-context";
import {
  createTestAsset,
  patchActionConfig,
  restoreActionConfig,
} from "../test-data";
import { MICRO_APP_CONFIG } from "../config";

test.describe("Asset approval flow", () => {
  test("submits approval from asset detail and approves it", async ({ page }) => {
    const asset = await createTestAsset(page.request);
    const originalConfig = await patchActionConfig(page.request, "purchase", {
      requiresApproval: true,
      defaultApproverType: "user",
      defaultApproverRefs: [MICRO_APP_CONFIG.userId],
      allowOverride: false,
    });

    try {
      const app = await openApp(page, `/en/assets/${asset.id}`);
      await expect(app.getByRole("heading", { name: asset.name })).toBeVisible();

      const approvalTitle = `E2E Flow ${Date.now()}`;
      const approvalReason = `Automated reason ${new Date().toISOString()}`;

      await app.getByLabel("Title").fill(approvalTitle);
      await app.getByLabel("Reason").fill(approvalReason);
      await app.getByRole("button", { name: "Submit Request" }).click();

      const approvalCard = app.locator("li", { hasText: approvalTitle }).first();
      await expect(approvalCard).toBeVisible();

      const metaText = await approvalCard.locator("p.text-xs").innerText();
      const approvalId = metaText.match(/#([A-Z0-9-]+)/i)?.[1];
      if (!approvalId) {
        throw new Error("Failed to parse approval ID from card metadata.");
      }

      await approvalCard.getByRole("link", { name: "View details" }).click();

      await expect(app.getByRole("heading", { name: "Approval Detail" })).toBeVisible();
      await expect(app.getByText(approvalTitle)).toBeVisible();

      await app.getByRole("button", { name: "Submit" }).click();

      await expect(app.getByText("Approved")).toBeVisible();
      await expect(app.getByText(approvalTitle)).toBeVisible();
    } finally {
      await restoreActionConfig(page.request, originalConfig);
    }
  });
});



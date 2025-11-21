import { test, expect, type Page } from "@playwright/test";
import { openApp, type AppContext } from "../app-context";
import { createTestAsset, createTestApproval } from "../test-data";

async function selectDropdownOption(page: Page, app: AppContext, triggerTestId: string, optionPattern: RegExp) {
  const trigger = app.locator(`[data-testid="${triggerTestId}"]`);
  const frameOption = app.getByRole("option", { name: optionPattern }).first();
  const hostOption = page.locator('[role="option"]', { hasText: optionPattern }).first(); // Radix portal may mount on host

  const waitForVisibleOption = async (timeout: number) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await frameOption.isVisible()) return frameOption;
      if (await hostOption.isVisible()) return hostOption;
      await page.waitForTimeout(100);
    }
    return null;
  };

  for (const timeout of [2500, 4000]) {
    await trigger.click();
    const option = await waitForVisibleOption(timeout);
    if (option) {
      await option.click();
      return;
    }
  }

  throw new Error(`Dropdown option ${optionPattern.toString()} not found`);
}

test.describe("Approvals center", () => {
  test("filters by status and type, updates export link", async ({ page }) => {
    const pendingAsset = await createTestAsset(page.request);
    const pendingApproval = await createTestApproval(page.request, {
      assetId: pendingAsset.id,
      type: "inbound",
      status: "pending",
      title: `E2E Pending ${Date.now()}`,
    });

    const approvedAsset = await createTestAsset(page.request);
    const approvedApproval = await createTestApproval(page.request, {
      assetId: approvedAsset.id,
      type: "purchase",
      status: "approved",
      title: `E2E Approved ${Date.now()}`,
    });

    const app = await openApp(page, "/en/approvals");

    await expect(app.getByRole("heading", { name: "Approvals" })).toBeVisible();

    const exportLink = app.getByRole("link", { name: "Export CSV" });
    await expect(exportLink).toHaveAttribute("href", /approvals\/export/);

    await selectDropdownOption(page, app, "approval-status-filter", /待审批|Pending/);
    await selectDropdownOption(page, app, "approval-type-filter", /入库确认|Inbound/);

    await expect(app.getByText(pendingApproval.title)).toBeVisible();
    await expect(app.getByText(approvedApproval.title)).toHaveCount(0);
    await expect(exportLink).toHaveAttribute("href", /status=pending/);
    await expect(exportLink).toHaveAttribute("href", /type=inbound/);

    await expect(
      app.getByText(/Auto-generated/, { exact: false }).first(),
    ).toBeVisible();
  });

  test("opens approval detail from the list", async ({ page }) => {
    const asset = await createTestAsset(page.request);
    const approval = await createTestApproval(page.request, {
      assetId: asset.id,
      title: `E2E Detail ${Date.now()}`,
    });

    const app = await openApp(page, "/en/approvals");

    const targetRow = app.locator("tr", { hasText: approval.title }).first();
    await targetRow.getByRole("link", { name: approval.title }).click();

    await expect(app.getByRole("heading", { name: "Approval Detail" })).toBeVisible();
    await expect(app.getByText(approval.title)).toBeVisible();
  });

  test("switches role tabs to my requests", async ({ page }) => {
    await createTestApproval(page.request, {});

    const app = await openApp(page, "/en/approvals");

    const myRequestsTab = app.locator('[data-testid="approval-role-my-requests"]');
    await myRequestsTab.click();

    await expect
      .poll(async () =>
        app.locator("body").evaluate(() => window.location.search),
      )
      .toContain("role=my-requests");
  });
});

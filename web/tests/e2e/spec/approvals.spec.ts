import { test, expect, type Page } from "@playwright/test";
import { openApp, type AppContext } from "../app-context";

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
    const app = await openApp(page, "/en/approvals");

    await expect(app.getByRole("heading", { name: "Approvals" })).toBeVisible();

    const exportLink = app.getByRole("link", { name: "Export CSV" });
    await expect(exportLink).toHaveAttribute("href", /approvals\/export/);

    await selectDropdownOption(page, app, "approval-status-filter", /待审批|Pending/);

    await expect(exportLink).toHaveAttribute("href", /status=pending/);

    await selectDropdownOption(page, app, "approval-type-filter", /Purchase|采购审批/);

    await expect(exportLink).toHaveAttribute("href", /status=pending/);
    await expect(exportLink).toHaveAttribute("href", /type=purchase/);

    await expect(app.locator("table tbody tr").first()).toBeVisible();
  });

  test("opens approval detail from the list", async ({ page }) => {
    const app = await openApp(page, "/en/approvals");

    const approvalLinks = app.locator("table tbody tr a");
    const linkCount = await approvalLinks.count();
    if (linkCount === 0) {
      test.info().annotations.push({
        type: "skip",
        description: "No approval records available to open detail view.",
      });
      return;
    }

    await approvalLinks.first().click();

    await expect(app.getByText(/Approval Detail|审批详情/)).toBeVisible();
    await expect(app.getByText(/#APR-/)).toBeVisible();
  });
});

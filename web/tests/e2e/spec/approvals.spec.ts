import { test, expect, type Page } from "@playwright/test";
import { openApp, type AppContext } from "../app-context";

async function selectDropdownOption(page: Page, app: AppContext, triggerTestId: string, optionPattern: RegExp) {
  await app.locator(`[data-testid="${triggerTestId}"]`).click();
  const frameOption = app.getByRole("option", { name: optionPattern }).first();
  try {
    await frameOption.waitFor({ state: "visible", timeout: 1500 });
    await frameOption.click();
    return;
  } catch {
    // 在 DooTask 宿主 iframe 中，Radix Select 的 Portal 会挂载到宿主页面，
    // 此时需要直接在顶层 page 上寻找 option。
  }

  const hostOption = page
    .locator('[role="option"]', { hasText: optionPattern })
    .first();
  await hostOption.waitFor({ state: "visible" });
  await hostOption.click();
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



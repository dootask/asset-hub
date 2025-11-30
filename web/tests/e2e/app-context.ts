import type { FrameLocator, Locator, Page } from "@playwright/test";
import {
  MICRO_APP_CONFIG,
  buildMicroAppTestUrl,
  normalizeAppPath,
} from "./config";

const IFRAME_SELECTOR = 'iframe[class="micro-app-iframe-container"]';

type ContextTarget = Page | FrameLocator;

export interface AppContext {
  locator: (selector: string, options?: Parameters<Page["locator"]>[1]) => Locator;
  getByRole: Page["getByRole"];
  getByLabel: Page["getByLabel"];
  getByText: Page["getByText"];
}

function wrap(target: ContextTarget): AppContext {
  return {
    locator: (selector: string, options?: Parameters<Page["locator"]>[1]) =>
      target.locator(selector, options),
    getByRole: target.getByRole.bind(target),
    getByLabel: target.getByLabel.bind(target),
    getByText: target.getByText.bind(target),
  };
}

export async function openApp(page: Page, path = "/en"): Promise<AppContext> {
  const normalizedPath = normalizeAppPath(path);
  const targetUrl = buildMicroAppTestUrl(normalizedPath);
  await page.goto(targetUrl);
  await page.waitForSelector(IFRAME_SELECTOR, { state: "visible" });
  const iframeLocator = page.frameLocator(IFRAME_SELECTOR);
  await iframeLocator.locator("body").waitFor();
  await iframeLocator.locator("body").evaluate(
    (_, user) => {
      const resolvedId = Number(user.id);
      const payload = {
        userId: String(Number.isFinite(resolvedId) ? resolvedId : user.id),
        nickname: user.nickname,
      };
      try {
        sessionStorage.setItem("asset-hub:auth", JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent("asset-hub:user-updated", { detail: payload }));
      } catch {
        // ignore access errors in non-browser contexts
      }
    },
    { id: MICRO_APP_CONFIG.userId, nickname: "Playwright E2E" },
  );
  return wrap(iframeLocator);
}

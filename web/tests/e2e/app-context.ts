import type { FrameLocator, Locator, Page } from "@playwright/test";
import { buildMicroAppTestUrl, normalizeAppPath } from "./config";

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
  return wrap(iframeLocator);
}



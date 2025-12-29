"use client";

import { appReady, downloadUrl, UnsupportedError } from "@dootask/tools";
import { getStoredAuth, getStoredLocale } from "@/lib/utils/auth-storage";

/**
 * Trigger a file download via DooTask's downloadUrl API, falling back to a normal window.open.
 */
export async function downloadWithDooTask(url: string) {
  if (!url) return;

  const normalizedUrl = (() => {
    try {
      return new URL(url, typeof window !== "undefined" ? window.location.origin : undefined).toString();
    } catch {
      return url;
    }
  })();
  const enrichedUrl = (() => {
    try {
      const parsed = new URL(normalizedUrl);
      const stored = getStoredAuth();
      if (stored?.token && !parsed.searchParams.get("token")) {
        parsed.searchParams.set("token", stored.token);
      }
      if (!parsed.searchParams.get("lang")) {
        const storedLocale = stored?.locale ?? getStoredLocale() ?? undefined;
        parsed.searchParams.set("lang", storedLocale === "zh" ? "zh" : "en");
      }
      return parsed.toString();
    } catch {
      return normalizedUrl;
    }
  })();

  try {
    await appReady().catch(() => undefined);
    await downloadUrl(enrichedUrl);
  } catch (error) {
    if (typeof window !== "undefined") {
      window.open(enrichedUrl, "_blank", "noopener,noreferrer");
    }
    if (!(error instanceof UnsupportedError)) {
      console.error("downloadUrl failed, opened via window instead:", error);
    }
  }
}

"use client";

import { appReady, downloadUrl, UnsupportedError } from "@dootask/tools";

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

  try {
    await appReady().catch(() => undefined);
    await downloadUrl(normalizedUrl);
  } catch (error) {
    if (typeof window !== "undefined") {
      window.open(normalizedUrl, "_blank", "noopener,noreferrer");
    }
    if (!(error instanceof UnsupportedError)) {
      console.error("downloadUrl failed, opened via window instead:", error);
    }
  }
}

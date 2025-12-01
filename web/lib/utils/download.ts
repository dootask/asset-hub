"use client";

import { appReady, downloadUrl, UnsupportedError } from "@dootask/tools";

/**
 * Trigger a file download via DooTask's downloadUrl API, falling back to a normal window.open.
 */
export async function downloadWithDooTask(url: string) {
  if (!url) return;

  try {
    await appReady().catch(() => undefined);
    await downloadUrl(url);
  } catch (error) {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    if (!(error instanceof UnsupportedError)) {
      console.error("downloadUrl failed, opened via window instead:", error);
    }
  }
}

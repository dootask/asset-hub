export async function getRequestBaseUrl() {
  const preset =
    process.env.ASSET_HUB_BASE_URL ??
    process.env.NEXT_PUBLIC_ASSET_HUB_BASE_URL;
  if (preset) {
    return preset.replace(/\/$/, "");
  }

  // If running in the browser (should be rare for this helper), fall back to the current origin.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    const host =
      headerStore.get("x-forwarded-host") ?? headerStore.get("host");

    if (host) {
      const protocol = host.includes("localhost") ? "http" : "https";
      return `${protocol}://${host}`;
    }
  } catch {
    // Ignore when request headers are not available (e.g., non-request contexts).
  }

  return "http://localhost:3000";
}

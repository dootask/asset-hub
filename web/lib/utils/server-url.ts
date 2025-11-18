import { headers } from "next/headers";

export async function getRequestBaseUrl() {
  const preset =
    process.env.ASSET_HUB_BASE_URL ??
    process.env.NEXT_PUBLIC_ASSET_HUB_BASE_URL;
  if (preset) {
    return preset.replace(/\/$/, "");
  }

  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}


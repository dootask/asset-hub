import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig } from "@/lib/config";
import { isAdminUser } from "@/lib/utils/permissions";
import { normalizeUserId } from "@/lib/utils/user-id";

async function getHeaderUserId(): Promise<string | number | null> {
  const incomingHeaders = await headers();
  const id = incomingHeaders.get("x-user-id");
  if (id) {
    return normalizeUserId(id) ?? id;
  }

  if (process.env.NODE_ENV !== "production") {
    const fallback = appConfig.permissions.adminUserIds[0];
    if (fallback !== undefined) {
      return fallback;
    }
  }

  return null;
}

export async function requireAdminUser(locale?: string) {
  const userId = await getHeaderUserId();
  if (!isAdminUser(userId)) {
    redirect(locale ? `/${locale}` : "/");
  }
  return userId;
}

export async function getServerUserId() {
  const userId = await getHeaderUserId();
  return typeof userId === "number" ? userId : normalizeUserId(userId);
}


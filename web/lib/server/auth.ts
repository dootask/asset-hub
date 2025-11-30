import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig } from "@/lib/config";
import { isAdminUser } from "@/lib/utils/permissions";
import {
  parseUserCookieValue,
  USER_COOKIE_NAME,
} from "@/lib/utils/user-cookie";

async function getRequestUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(USER_COOKIE_NAME)?.value ?? null;
  const cookieUser = parseUserCookieValue(cookieValue);
  if (cookieUser) {
    return cookieUser.id;
  }

  if (appConfig.env !== "production") {
    const fallback = appConfig.permissions.adminUserIds[0];
    if (fallback !== undefined) {
      return fallback;
    }
  }

  return null;
}

export async function requireAdminUser(locale?: string) {
  const userId = await getRequestUserId();
  if (!isAdminUser(userId)) {
    redirect(locale ? `/${locale}` : "/");
  }
  return userId;
}

export async function getServerUserId() {
  const userId = await getRequestUserId();
  return userId;
}

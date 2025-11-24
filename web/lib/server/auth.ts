import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/utils/permissions";
import { normalizeUserId } from "@/lib/utils/user-id";

function getHeaderUserId(): string | number | null {
  const incomingHeaders = headers();
  const id =
    incomingHeaders.get("x-user-id") ??
    incomingHeaders.get("x-userid") ??
    incomingHeaders.get("x-user_id");
  if (!id) {
    return null;
  }
  return normalizeUserId(id) ?? id;
}

export function requireAdminUser(locale?: string) {
  const userId = getHeaderUserId();
  if (!isAdminUser(userId)) {
    redirect(locale ? `/${locale}` : "/");
  }
  return userId;
}

export function getServerUserId() {
  const userId = getHeaderUserId();
  return typeof userId === "number" ? userId : normalizeUserId(userId);
}


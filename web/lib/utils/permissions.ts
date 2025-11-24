import { appConfig } from "@/lib/config";
import { normalizeUserId } from "@/lib/utils/user-id";

export function isAdminUser(userId?: string | number | null) {
  const whitelist = appConfig.permissions.adminUserIds;
  if (!whitelist || whitelist.length === 0) {
    return true;
  }
  const normalized = normalizeUserId(userId);
  if (normalized === null) {
    return false;
  }
  return whitelist.includes(normalized);
}

export function isApproverUser(userId?: string | number | null) {
  const whitelist = appConfig.permissions.approverUserIds;
  if (!whitelist || whitelist.length === 0) {
    return false;
  }
  const normalized = normalizeUserId(userId);
  if (normalized === null) {
    return false;
  }
  return whitelist.includes(normalized);
}

export function canApproveUser(userId?: string | number | null) {
  if (isAdminUser(userId)) {
    return true;
  }
  return isApproverUser(userId);
}

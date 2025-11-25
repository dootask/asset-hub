import { appConfig } from "@/lib/config";
import { normalizeUserId } from "@/lib/utils/user-id";

export function isAdminUser(userId?: string | number | null) {
  const whitelist = appConfig.permissions.adminUserIds;
  // 当未配置任何管理员 ID 时，不视为“所有人都是管理员”，而是默认没有管理员，
  // 以避免生产环境误开放系统管理与高危操作权限。
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

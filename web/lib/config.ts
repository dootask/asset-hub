import path from "path";
import { normalizeUserId } from "@/lib/utils/user-id";

function resolvePath(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

const defaultDbPath = path.join(process.cwd(), "data", "asset-hub.db");

export function getDbFilePath() {
  return resolvePath(process.env.ASSET_HUB_DB_PATH, defaultDbPath);
}

function parseNumberCsv(value: string | undefined) {
  return (
    value
      ?.split(",")
      .map((entry) => normalizeUserId(entry))
      .filter((id: number | null): id is number => id !== null) ?? []
  );
}

function parseNumberEnv(value: string | undefined, fallback?: number) {
  if (value === undefined || value === null || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

export const appConfig = {
  env: process.env.NODE_ENV ?? "development",
  baseUrl: process.env.ASSET_HUB_BASE_URL,
  db: {
    filePath: getDbFilePath(),
  },
  permissions: {
    adminUserIds: parseNumberCsv(process.env.ASSET_HUB_ADMIN_USER_IDS),
  },
  release: {
    version: process.env.ASSET_HUB_VERSION ?? "0.1.0-preview",
    releasedAt:
      process.env.ASSET_HUB_RELEASED_AT ??
      new Date().toISOString().slice(0, 10),
    edition: process.env.ASSET_HUB_LICENSE_EDITION ?? "Community",
    plan: process.env.ASSET_HUB_LICENSE_PLAN ?? "Community",
    changelogUrl:
      process.env.ASSET_HUB_CHANGELOG_URL ??
      "https://dootask.com/apps/asset-hub/changelog",
    maxUsers: parseNumberEnv(process.env.ASSET_HUB_LICENSE_MAX_USERS),
    expiresAt: process.env.ASSET_HUB_LICENSE_EXPIRES_AT ?? null,
  },
};

export function getDataDirectory() {
  return path.dirname(getDbFilePath());
}

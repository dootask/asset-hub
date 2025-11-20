import path from "path";

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

function parseCsv(value: string | undefined) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

export const appConfig = {
  env: process.env.NODE_ENV ?? "development",
  baseUrl: process.env.ASSET_HUB_BASE_URL,
  db: {
    filePath: getDbFilePath(),
  },
  permissions: {
    adminUserIds: parseCsv(process.env.ASSET_HUB_ADMIN_USER_IDS),
  },
};

export function getDataDirectory() {
  return path.dirname(getDbFilePath());
}


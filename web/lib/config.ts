import path from "path";

function resolvePath(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

const defaultDbPath = path.join(process.cwd(), "data", "asset-hub.db");

export const appConfig = {
  env: process.env.NODE_ENV ?? "development",
  baseUrl: process.env.ASSET_HUB_BASE_URL,
  db: {
    filePath: resolvePath(process.env.ASSET_HUB_DB_PATH, defaultDbPath),
  },
  dootask: {
    apiBaseUrl: process.env.DOOTASK_API_BASE_URL ?? "",
    apiToken: process.env.DOOTASK_API_TOKEN ?? "",
  },
};

export function getDataDirectory() {
  return path.dirname(appConfig.db.filePath);
}


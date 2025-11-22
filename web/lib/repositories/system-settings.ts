import { getDb } from "@/lib/db/client";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/db/schema";

export type SystemSettingKey = keyof typeof DEFAULT_SYSTEM_SETTINGS;

export type AlertSettings = {
  alertsEnabled: boolean;
  pushEnabled: boolean;
};

function mapRow(row?: { value: string | null }) {
  if (!row) return null;
  return row.value;
}

function readSetting(key: SystemSettingKey) {
  const db = getDb();
  const row = db
    .prepare(`SELECT value FROM system_settings WHERE key = ? LIMIT 1`)
    .get(key) as { value: string | null } | undefined;
  return mapRow(row);
}

export function getSystemSetting(
  key: SystemSettingKey,
  fallback?: string,
): string | null {
  const value = readSetting(key);
  if (value === null || value === undefined) {
    return fallback ?? DEFAULT_SYSTEM_SETTINGS[key] ?? null;
  }
  return value;
}

export function getSystemBooleanSetting(
  key: SystemSettingKey,
  fallback = true,
) {
  const value = getSystemSetting(key);
  if (value === null) {
    return fallback;
  }
  return value === "true" || value === "1";
}

export function upsertSystemSettings(
  settings: Partial<Record<SystemSettingKey, string | number | boolean>>,
) {
  const db = getDb();
  const entries = Object.entries(settings).filter(
    (entry): entry is [SystemSettingKey, string | number | boolean] =>
      entry[0] in DEFAULT_SYSTEM_SETTINGS && entry[1] !== undefined,
  );

  if (!entries.length) {
    return;
  }

  const stmt = db.prepare(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES (@key, @value, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  );
  const transaction = db.transaction(() => {
    entries.forEach(([key, value]) => {
      stmt.run({
        key,
        value: typeof value === "string" ? value : String(value),
      });
    });
  });
  transaction();
}

export function getAlertSettings(): AlertSettings {
  return {
    alertsEnabled: getSystemBooleanSetting("consumableAlertsEnabled", true),
    pushEnabled: getSystemBooleanSetting("consumableAlertsPushEnabled", true),
  };
}

export function updateAlertSettings(settings: AlertSettings) {
  upsertSystemSettings({
    consumableAlertsEnabled: settings.alertsEnabled,
    consumableAlertsPushEnabled: settings.pushEnabled,
  });
}



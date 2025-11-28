import Database from "better-sqlite3";
import fs from "fs";
import { getDataDirectory, getDbFilePath } from "@/lib/config";
import {
  CREATE_TABLES,
  seedAssetCategories,
  seedCompanies,
  seedRoles,
  seedAssets,
  seedOperations,
  seedApprovalRequests,
  seedActionConfigs,
  seedOperationTemplates,
  seedConsumableCategories,
  seedConsumables,
  DEFAULT_SYSTEM_SETTINGS,
} from "@/lib/db/schema";

let db: Database.Database | null = null;

function seedTableIfEmpty(
  database: Database.Database,
  table: string,
  rows: Record<string, unknown>[],
  columns: string[],
) {
  const { count } = database
    .prepare(`SELECT COUNT(1) as count FROM ${table}`)
    .get() as { count: number };

  if (count > 0) {
    return;
  }

  const placeholders = columns.map((column) => `@${column}`).join(", ");
  const stmt = database.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
  );

  const insertMany = database.transaction((payload: typeof rows) => {
    payload.forEach((record) => stmt.run(record));
  });

  insertMany(rows);
}

function ensureSystemSetting(database: Database.Database, key: string, value: string) {
  const existing = database
    .prepare(`SELECT value FROM system_settings WHERE key = ? LIMIT 1`)
    .get(key) as { value: string | null } | undefined;
  if (existing && existing.value !== null && existing.value !== undefined) {
    return;
  }
  database.prepare(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES (@key, @value, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run({ key, value });
}

function seedDatabase(database: Database.Database) {
  // 确保默认系统配置
  Object.entries(DEFAULT_SYSTEM_SETTINGS).forEach(([key, value]) => {
    ensureSystemSetting(database, key, value);
  });

  // 按依赖顺序插入种子数据
  seedTableIfEmpty(database, "companies", seedCompanies, [
    "id", "name", "code", "description",
  ]);

  seedTableIfEmpty(database, "roles", seedRoles, [
    "id", "name", "scope", "description", "member_user_ids",
  ]);

  seedTableIfEmpty(database, "asset_categories", seedAssetCategories, [
    "id", "code", "label_zh", "label_en", "description", "color",
  ]);

  seedTableIfEmpty(
    database,
    "assets",
    seedAssets.map((asset) => ({
      ...asset,
      purchase_date: asset.purchaseDate,
    })),
    ["id", "name", "category", "status", "company_code", "owner", "location", "purchase_date"],
  );

  seedTableIfEmpty(database, "asset_operations", seedOperations, [
    "id", "asset_id", "type", "description", "actor", "status",
  ]);

  seedTableIfEmpty(database, "asset_operation_templates", seedOperationTemplates, [
    "id", "type", "label_zh", "label_en", "description_zh", "description_en", "require_attachment", "metadata",
  ]);

  seedTableIfEmpty(database, "asset_approval_requests", seedApprovalRequests, [
    "id", "asset_id", "consumable_id", "operation_id", "consumable_operation_id",
    "type", "status", "title", "reason", "applicant_id", "applicant_name",
    "approver_id", "approver_name", "result", "external_todo_id", "metadata", "completed_at",
  ]);

  seedTableIfEmpty(database, "asset_action_configs", seedActionConfigs, [
    "id", "label_zh", "label_en", "requires_approval", "default_approver_type",
    "default_approver_refs", "allow_override", "metadata",
  ]);

  seedTableIfEmpty(database, "consumable_categories", seedConsumableCategories, [
    "id", "code", "label_zh", "label_en", "description", "unit",
  ]);

  seedTableIfEmpty(database, "consumables", seedConsumables, [
    "id", "name", "category", "status", "company_code", "quantity",
    "reserved_quantity", "unit", "keeper", "location", "safety_stock", "description", "metadata",
  ]);
}

function ensureDatabase() {
  const dataDir = getDataDirectory();
  const dbFile = getDbFilePath();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbFile);
  db.pragma("journal_mode = WAL");

  // 创建表结构
  Object.values(CREATE_TABLES).forEach((sql) => {
    db!.exec(sql);
  });

  // 插入种子数据（如果表为空）
  seedDatabase(db);
}

export function getDb() {
  if (!db) {
    ensureDatabase();
  }

  return db!;
}

export function resetDbForTesting() {
  if (process.env.NODE_ENV !== "test") return;
  if (db) {
    db.close();
    db = null;
  }
}

export function checkpointDb() {
  if (!db) return;
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    // best-effort: ignore checkpoint failures
  }
}

export function closeDb() {
  if (db) {
    try {
      db.close();
    } catch {
      // ignore close errors
    } finally {
      db = null;
    }
  }
}

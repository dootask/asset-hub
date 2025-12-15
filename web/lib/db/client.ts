import Database from "better-sqlite3";
import fs from "fs";
import { appConfig, getDataDirectory, getDbFilePath } from "@/lib/config";
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

function getColumnNames(database: Database.Database, table: string): Set<string> {
  const rows = database
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name?: unknown }>;
  return new Set(
    rows
      .map((row) => (typeof row.name === "string" ? row.name : ""))
      .filter(Boolean),
  );
}

function migrateAssetsTable(database: Database.Database) {
  const columns = getColumnNames(database, "assets");

  const migrations: Array<{
    column: string;
    sql: string;
  }> = [
    {
      column: "asset_no",
      sql: "ALTER TABLE assets ADD COLUMN asset_no TEXT",
    },
    {
      column: "spec_model",
      sql: "ALTER TABLE assets ADD COLUMN spec_model TEXT",
    },
    {
      column: "purchase_price_cents",
      sql: "ALTER TABLE assets ADD COLUMN purchase_price_cents INTEGER",
    },
    {
      column: "purchase_currency",
      sql:
        "ALTER TABLE assets ADD COLUMN purchase_currency TEXT NOT NULL DEFAULT ('CNY')",
    },
  ];

  migrations.forEach((migration) => {
    if (columns.has(migration.column)) {
      return;
    }
    try {
      database.exec(migration.sql);
    } catch (error) {
      console.error(`Failed to migrate assets.${migration.column}:`, error);
    }
  });

  try {
    const refreshedColumns = getColumnNames(database, "assets");
    if (refreshedColumns.has("asset_no")) {
      database.exec(
        "UPDATE assets SET asset_no = id WHERE asset_no IS NULL OR asset_no = ''",
      );
    }
  } catch (error) {
    console.error("Failed to backfill assets.asset_no:", error);
  }

  try {
    database.exec(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_asset_no_unique
      ON assets(asset_no)
      WHERE asset_no IS NOT NULL AND asset_no <> '';
    `,
    );
  } catch (error) {
    console.error("Failed to ensure idx_assets_asset_no_unique:", error);
  }
}

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

/**
 * 初始化系统必需的配置数据（无论 SKIP_SEED 如何设置都会执行）
 */
function seedSystemConfig(database: Database.Database) {
  // 系统设置
  Object.entries(DEFAULT_SYSTEM_SETTINGS).forEach(([key, value]) => {
    ensureSystemSetting(database, key, value);
  });

  // 操作配置（定义哪些操作需要审批）
  seedTableIfEmpty(database, "asset_action_configs", seedActionConfigs, [
    "id", "label_zh", "label_en", "requires_approval", "default_approver_type",
    "default_approver_refs", "allow_override", "metadata",
  ]);

  // 操作模板（定义各操作类型的字段）
  seedTableIfEmpty(database, "asset_operation_templates", seedOperationTemplates, [
    "id", "type", "label_zh", "label_en", "description_zh", "description_en", "require_attachment", "metadata",
  ]);
}

/**
 * 插入示例数据（仅当 SKIP_SEED 未设置时执行）
 */
function seedSampleData(database: Database.Database) {
  // 在测试环境下不插入示例数据，避免与单测自行构造的数据发生唯一约束冲突
  if (appConfig.env === "test") {
    return;
  }

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
    [
      "id",
      "asset_no",
      "name",
      "category",
      "spec_model",
      "status",
      "company_code",
      "owner",
      "location",
      "purchase_date",
      "purchase_price_cents",
      "purchase_currency",
    ],
  );

  seedTableIfEmpty(database, "asset_operations", seedOperations, [
    "id", "asset_id", "type", "description", "actor", "status",
  ]);

  seedTableIfEmpty(database, "asset_approval_requests", seedApprovalRequests, [
    "id", "asset_id", "consumable_id", "operation_id", "consumable_operation_id",
    "type", "status", "title", "reason", "applicant_id", "applicant_name",
    "approver_id", "approver_name", "result", "external_todo_id", "metadata", "completed_at",
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

  // 轻量自迁移：为旧数据库补齐缺失列/索引
  migrateAssetsTable(db);

  // 系统配置（必须插入）
  seedSystemConfig(db);

  // 示例数据（可选）
  if (!appConfig.db.skipSeed) {
    seedSampleData(db);
  }
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

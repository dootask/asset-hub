import fs from "fs";
import Database from "better-sqlite3";
import { getDataDirectory, getDbFilePath } from "@/lib/config";
import {
  CREATE_TABLES,
  DEFAULT_SYSTEM_SETTINGS,
  seedActionConfigs,
  seedApprovalRequests,
  seedAssetCategories,
  seedAssets,
  seedCompanies,
  seedConsumableCategories,
  seedConsumables,
  seedOperationTemplates,
  seedOperations,
  seedRoles,
} from "@/lib/db/schema";

const dbPath = getDbFilePath();
const dataDir = getDataDirectory();

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

function createTables() {
  Object.values(CREATE_TABLES).forEach((sql) => db.exec(sql));
}

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];

  const exists = columns.some((entry) => entry.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

function ensureSchemaUpgrades() {
  ensureColumn("asset_operations", "status", "status TEXT NOT NULL DEFAULT 'done'");
  ensureColumn("asset_operations", "metadata", "metadata TEXT");
  ensureColumn(
    "asset_operations",
    "updated_at",
    "updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
  );
  ensureColumn(
    "asset_approval_requests",
    "consumable_id",
    "consumable_id TEXT",
  );
  ensureColumn(
    "asset_approval_requests",
    "consumable_operation_id",
    "consumable_operation_id TEXT",
  );
  ensureColumn(
    "consumables",
    "reserved_quantity",
    "reserved_quantity INTEGER NOT NULL DEFAULT 0",
  );
  ensureColumn("assets", "company_code", "company_code TEXT");
  ensureColumn("consumables", "company_code", "company_code TEXT");
  ensureColumn("roles", "member_user_ids", "member_user_ids TEXT");
}

function ensureSystemSetting(key: string, value: string) {
  const existing = db
    .prepare(`SELECT value FROM system_settings WHERE key = ? LIMIT 1`)
    .get(key) as { value: string | null } | undefined;
  if (existing && existing.value !== null && existing.value !== undefined) {
    return;
  }
  db.prepare(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES (@key, @value, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run({ key, value });
}

function ensureDefaultSystemSettings() {
  Object.entries(DEFAULT_SYSTEM_SETTINGS).forEach(([key, value]) => {
    ensureSystemSetting(key, value);
  });
}

function seedTable({
  table,
  rows,
  columns,
}: {
  table: string;
  rows: Record<string, unknown>[];
  columns: string[];
}) {
  const { count } = db
    .prepare(`SELECT COUNT(1) as count FROM ${table}`)
    .get() as { count: number };

  if (count > 0) {
    return;
  }

  const placeholders = columns.map((column) => `@${column}`).join(", ");
  const stmt = db.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
  );

  const insertMany = db.transaction((payload: typeof rows) => {
    payload.forEach((record) => stmt.run(record));
  });

  insertMany(rows);
}

function run() {
  createTables();
  ensureSchemaUpgrades();
  ensureDefaultSystemSettings();

  seedTable({
    table: "companies",
    rows: seedCompanies,
    columns: ["id", "name", "code", "description"],
  });

  seedTable({
    table: "roles",
    rows: seedRoles,
    columns: ["id", "name", "scope", "description", "member_user_ids"],
  });

  seedTable({
    table: "asset_categories",
    rows: seedAssetCategories,
    columns: ["id", "code", "label_zh", "label_en", "description", "color"],
  });

  seedTable({
    table: "assets",
    rows: seedAssets.map((asset) => ({
      ...asset,
      purchase_date: asset.purchaseDate,
    })),
    columns: [
      "id",
      "name",
      "category",
      "status",
      "company_code",
      "owner",
      "location",
      "purchase_date",
    ],
  });

  seedTable({
    table: "asset_operations",
    rows: seedOperations,
    columns: ["id", "asset_id", "type", "description", "actor", "status"],
  });

  seedTable({
    table: "asset_operation_templates",
    rows: seedOperationTemplates,
    columns: [
      "id",
      "type",
      "label_zh",
      "label_en",
      "description_zh",
      "description_en",
      "require_attachment",
      "metadata",
    ],
  });

  seedTable({
    table: "asset_approval_requests",
    rows: seedApprovalRequests,
    columns: [
      "id",
      "asset_id",
      "consumable_id",
      "operation_id",
      "consumable_operation_id",
      "type",
      "status",
      "title",
      "reason",
      "applicant_id",
      "applicant_name",
      "approver_id",
      "approver_name",
      "result",
      "external_todo_id",
      "metadata",
      "completed_at",
    ],
  });

  seedTable({
    table: "asset_action_configs",
    rows: seedActionConfigs,
    columns: [
      "id",
      "label_zh",
      "label_en",
      "requires_approval",
      "default_approver_type",
      "default_approver_refs",
      "allow_override",
      "metadata",
    ],
  });

  seedTable({
    table: "consumable_categories",
    rows: seedConsumableCategories,
    columns: ["id", "code", "label_zh", "label_en", "description", "unit"],
  });

  seedTable({
    table: "consumables",
    rows: seedConsumables,
    columns: [
      "id",
      "name",
      "category",
      "status",
      "company_code",
      "quantity",
      "reserved_quantity",
      "unit",
      "keeper",
      "location",
      "safety_stock",
      "description",
      "metadata",
    ],
  });

  console.log(`SQLite migrated: ${dbPath}`);
}

run();
db.close();


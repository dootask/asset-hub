import fs from "fs";
import Database from "better-sqlite3";
import { getDataDirectory, getDbFilePath } from "@/lib/config";
import {
  CREATE_TABLES,
  seedApprovalRequests,
  seedAssets,
  seedCompanies,
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

  seedTable({
    table: "companies",
    rows: seedCompanies,
    columns: ["id", "name", "code", "description"],
  });

  seedTable({
    table: "roles",
    rows: seedRoles,
    columns: ["id", "name", "scope", "description"],
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
    table: "asset_approval_requests",
    rows: seedApprovalRequests,
    columns: [
      "id",
      "asset_id",
      "operation_id",
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

  console.log(`SQLite migrated: ${dbPath}`);
}

run();
db.close();


import fs from "fs";
import Database from "better-sqlite3";
import { appConfig, getDataDirectory } from "@/lib/config";
import {
  CREATE_TABLES,
  seedAssets,
  seedCompanies,
  seedOperations,
  seedRoles,
} from "@/lib/db/schema";

const dbPath = appConfig.db.filePath;
const dataDir = getDataDirectory();

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

function createTables() {
  Object.values(CREATE_TABLES).forEach((sql) => db.exec(sql));
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
    columns: ["id", "asset_id", "type", "description", "actor"],
  });

  console.log(`SQLite migrated: ${dbPath}`);
}

run();
db.close();


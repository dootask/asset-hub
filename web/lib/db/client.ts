import Database from "better-sqlite3";
import fs from "fs";
import { getDataDirectory, getDbFilePath } from "@/lib/config";
import { CREATE_TABLES } from "@/lib/db/schema";

let db: Database.Database | null = null;

function ensureDatabase() {
  const dataDir = getDataDirectory();
  const dbFile = getDbFilePath();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbFile);
  db.pragma("journal_mode = WAL");

  Object.values(CREATE_TABLES).forEach((sql) => {
    db!.exec(sql);
  });
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


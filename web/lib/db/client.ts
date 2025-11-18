import Database from "better-sqlite3";
import fs from "fs";
import { appConfig, getDataDirectory } from "@/lib/config";
import { CREATE_TABLES } from "@/lib/db/schema";

const DATA_DIR = getDataDirectory();
const DB_FILE = appConfig.db.filePath;

let db: Database.Database | null = null;

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_FILE);
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


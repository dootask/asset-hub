import fs from "fs";
import path from "path";
import { getBackupDirectory, getDbFilePath } from "@/lib/config";
import { checkpointDb, closeDb } from "@/lib/db/client";
import type { BackupRecord } from "@/lib/types/backup";

type BackupMetadata = {
  createdAt: string;
  note?: string;
  createdBy?: string;
  source?: string;
};

const BACKUP_EXTENSION = ".db";

function ensureBackupDirectory() {
  const dir = getBackupDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function formatTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function backupIdToFilename(id: string) {
  return id.endsWith(BACKUP_EXTENSION) ? id : `${id}${BACKUP_EXTENSION}`;
}

function getBackupFilePath(id: string) {
  return path.join(ensureBackupDirectory(), backupIdToFilename(id));
}

function getMetadataFilePath(id: string) {
  return path.join(ensureBackupDirectory(), `${id}.json`);
}

function readMetadata(id: string): BackupMetadata | null {
  const metaPath = getMetadataFilePath(id);
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(metaPath, "utf-8");
    return JSON.parse(raw) as BackupMetadata;
  } catch {
    return null;
  }
}

function writeMetadata(id: string, metadata: BackupMetadata) {
  const metaPath = getMetadataFilePath(id);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf-8");
}

function statToIso(stats: fs.Stats) {
  const created = stats.birthtimeMs && stats.birthtimeMs > 0
    ? stats.birthtimeMs
    : stats.mtimeMs;
  return new Date(created).toISOString();
}

function toRecord(id: string, stats: fs.Stats, meta: BackupMetadata | null): BackupRecord {
  return {
    id,
    filename: backupIdToFilename(id),
    size: stats.size,
    createdAt: meta?.createdAt ?? statToIso(stats),
    note: meta?.note,
    createdBy: meta?.createdBy,
  };
}

export function listBackups(): BackupRecord[] {
  const dir = ensureBackupDirectory();
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const backups: BackupRecord[] = [];
  entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(BACKUP_EXTENSION))
    .forEach((entry) => {
      const id = entry.name.replace(new RegExp(`${BACKUP_EXTENSION}$`), "");
      const stats = fs.statSync(path.join(dir, entry.name));
      const meta = readMetadata(id);
      backups.push(toRecord(id, stats, meta));
    });
  return backups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function createBackup(options?: { note?: string; createdBy?: string | number }) {
  const dir = ensureBackupDirectory();
  const dbPath = getDbFilePath();
  checkpointDb();

  const now = new Date();
  const id = `asset-hub-backup-${formatTimestamp(now)}`;
  const targetPath = path.join(dir, `${id}${BACKUP_EXTENSION}`);

  fs.copyFileSync(dbPath, targetPath);
  const stats = fs.statSync(targetPath);
  const metadata: BackupMetadata = {
    createdAt: now.toISOString(),
    note: options?.note?.trim() || undefined,
    createdBy: options?.createdBy ? String(options.createdBy) : undefined,
  };
  writeMetadata(id, metadata);
  return toRecord(id, stats, metadata);
}

function removeWalFiles(dbPath: string) {
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  [walPath, shmPath].forEach((file) => {
    if (fs.existsSync(file)) {
      try {
        fs.rmSync(file);
      } catch {
        // ignore cleanup failures
      }
    }
  });
}

export function deleteBackup(id: string) {
  const filePath = getBackupFilePath(id);
  const metaPath = getMetadataFilePath(id);

  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
  }
  if (fs.existsSync(metaPath)) {
    fs.rmSync(metaPath);
  }
}

export function restoreBackup(id: string, options?: { actor?: string | number }) {
  const backupPath = getBackupFilePath(id);
  if (!fs.existsSync(backupPath)) {
    throw new Error("指定的备份不存在。");
  }
  const dbPath = getDbFilePath();
  checkpointDb();
  closeDb();
  removeWalFiles(dbPath);

  // safety snapshot before overwrite
  try {
    const now = new Date();
    const safetyId = `auto-pre-restore-${formatTimestamp(now)}`;
    const safetyPath = getBackupFilePath(safetyId);
    fs.copyFileSync(dbPath, safetyPath);
    const stats = fs.statSync(safetyPath);
    writeMetadata(safetyId, {
      createdAt: now.toISOString(),
      note: `Auto backup before restoring from ${id}`,
      createdBy: options?.actor ? String(options.actor) : undefined,
      source: id,
    });
    // keep record for listing
    toRecord(safetyId, stats, readMetadata(safetyId));
  } catch {
    // best-effort safety snapshot
  }

  fs.copyFileSync(backupPath, dbPath);
  removeWalFiles(dbPath);
}

export function getBackupFileStream(id: string) {
  const filePath = getBackupFilePath(id);
  if (!fs.existsSync(filePath)) {
    throw new Error("指定的备份不存在。");
  }
  return fs.createReadStream(filePath);
}

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  CreateInventoryTaskPayload,
  InventoryTask,
  InventoryTaskStatus,
} from "@/lib/types/inventory";

type InventoryTaskRow = {
  id: string;
  name: string;
  scope: string | null;
  filters: string | null;
  owner: string | null;
  status: InventoryTaskStatus;
  description: string | null;
  created_at: string;
};

function mapRow(row: InventoryTaskRow): InventoryTask {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope ?? undefined,
    filters: row.filters ? (JSON.parse(row.filters) as Record<string, unknown>) : undefined,
    owner: row.owner ?? undefined,
    status: row.status,
    description: row.description ?? undefined,
    createdAt: row.created_at,
  };
}

export function listInventoryTasks(): InventoryTask[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM asset_inventory_tasks ORDER BY created_at DESC`)
    .all() as InventoryTaskRow[];
  return rows.map(mapRow);
}

export function getInventoryTaskById(id: string): InventoryTask | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM asset_inventory_tasks WHERE id = ? LIMIT 1`)
    .get(id) as InventoryTaskRow | undefined;
  return row ? mapRow(row) : null;
}

export function createInventoryTask(
  payload: CreateInventoryTaskPayload,
): InventoryTask {
  const db = getDb();
  const id = `INV-${randomUUID().slice(0, 6).toUpperCase()}`;
  const status = payload.status ?? "draft";
  db.prepare(
    `INSERT INTO asset_inventory_tasks (
        id,
        name,
        scope,
        filters,
        owner,
        status,
        description,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @name,
        @scope,
        @filters,
        @owner,
        @status,
        @description,
        datetime('now'),
        datetime('now')
      )`,
  ).run({
    id,
    name: payload.name,
    scope: payload.scope ?? null,
    filters: payload.filters ? JSON.stringify(payload.filters) : null,
    owner: payload.owner ?? null,
    status,
    description: payload.description ?? null,
  });
  return getInventoryTaskById(id)!;
}

export function updateInventoryTaskStatus(
  id: string,
  status: InventoryTaskStatus,
): InventoryTask | null {
  const db = getDb();
  const existing = getInventoryTaskById(id);
  if (!existing) return null;
  db.prepare(
    `UPDATE asset_inventory_tasks
     SET status=@status,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({ id, status });
  return getInventoryTaskById(id);
}


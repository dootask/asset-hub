import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  ConsumableInventoryEntry,
  ConsumableInventoryTask,
  ConsumableInventoryTaskDetail,
  ConsumableInventoryTaskStatus,
  ConsumableInventoryTaskSummary,
  CreateConsumableInventoryTaskPayload,
  UpdateConsumableInventoryTaskPayload,
} from "@/lib/types/consumable-inventory";

type TaskRow = {
  id: string;
  name: string;
  scope: string | null;
  filters: string | null;
  owner: string | null;
  status: ConsumableInventoryTaskStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type TaskWithStatsRow = TaskRow & {
  total_entries: number | null;
  recorded_entries: number | null;
  variance_entries: number | null;
};

type EntryRow = {
  id: string;
  task_id: string;
  consumable_id: string;
  consumable_name: string;
  category: string | null;
  keeper: string | null;
  expected_quantity: number;
  expected_reserved: number;
  actual_quantity: number | null;
  actual_reserved: number | null;
  variance_quantity: number | null;
  variance_reserved: number | null;
  note: string | null;
  status: "pending" | "recorded";
  created_at: string;
  updated_at: string;
};

function mapTask(row: TaskRow): ConsumableInventoryTask {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope ?? undefined,
    filters: row.filters ? (JSON.parse(row.filters) as Record<string, unknown>) : undefined,
    owner: row.owner ?? undefined,
    status: row.status,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEntry(row: EntryRow): ConsumableInventoryEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    consumableId: row.consumable_id,
    consumableName: row.consumable_name,
    category: row.category ?? undefined,
    keeper: row.keeper ?? undefined,
    expectedQuantity: row.expected_quantity,
    expectedReserved: row.expected_reserved,
    actualQuantity: row.actual_quantity ?? undefined,
    actualReserved: row.actual_reserved ?? undefined,
    varianceQuantity: row.variance_quantity ?? undefined,
    varianceReserved: row.variance_reserved ?? undefined,
    note: row.note ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSummary(row: TaskWithStatsRow): ConsumableInventoryTaskSummary {
  return {
    ...mapTask(row),
    stats: {
      totalEntries: row.total_entries ?? 0,
      recordedEntries: row.recorded_entries ?? 0,
      varianceEntries: row.variance_entries ?? 0,
    },
  };
}

function buildEntriesSummary(entries: ConsumableInventoryEntry[]) {
  let recordedEntries = 0;
  let varianceEntries = 0;
  entries.forEach((entry) => {
    if (entry.status === "recorded") {
      recordedEntries += 1;
    }
    if (
      (entry.varianceQuantity ?? 0) !== 0 ||
      (entry.varianceReserved ?? 0) !== 0
    ) {
      varianceEntries += 1;
    }
  });

  return {
    totalEntries: entries.length,
    recordedEntries,
    varianceEntries,
  };
}

function selectConsumablesForTask(filters?: Record<string, unknown>) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  const categories = Array.isArray((filters as { categories?: unknown })?.categories)
    ? ((filters as { categories?: unknown[] }).categories ?? []).filter(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
      )
    : [];
  if (categories.length) {
    conditions.push(
      `category IN (${categories.map((_, index) => `@category${index}`).join(", ")})`,
    );
    categories.forEach((category, index) => {
      params[`category${index}`] = category;
    });
  }

  const keeper = (filters as { keeper?: unknown })?.keeper;
  if (typeof keeper === "string" && keeper.trim()) {
    conditions.push(`keeper = @keeper`);
    params.keeper = keeper;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT id,
              name,
              category,
              keeper,
              quantity,
              reserved_quantity,
              unit
         FROM consumables
        ${where}
        ORDER BY name`,
    )
    .all(params) as Array<{
      id: string;
      name: string;
      category: string | null;
      keeper: string | null;
      quantity: number;
      reserved_quantity: number;
    }>;
  return rows;
}

function insertInventoryEntries(
  taskId: string,
  filters?: Record<string, unknown>,
) {
  const consumables = selectConsumablesForTask(filters);
  if (!consumables.length) {
    throw new Error("匹配范围内没有可盘点的耗材，无法创建任务。");
  }
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO consumable_inventory_entries (
        id,
        task_id,
        consumable_id,
        consumable_name,
        category,
        keeper,
        expected_quantity,
        expected_reserved,
        status,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @task_id,
        @consumable_id,
        @consumable_name,
        @category,
        @keeper,
        @expected_quantity,
        @expected_reserved,
        'pending',
        datetime('now'),
        datetime('now')
      )`,
  );

  const insertMany = db.transaction(() => {
    consumables.forEach((item) => {
      stmt.run({
        id: `CINE-${randomUUID().slice(0, 8).toUpperCase()}`,
        task_id: taskId,
        consumable_id: item.id,
        consumable_name: item.name,
        category: item.category ?? null,
        keeper: item.keeper ?? null,
        expected_quantity: item.quantity,
        expected_reserved: item.reserved_quantity,
      });
    });
  });

  insertMany();
}

export function listConsumableInventoryTasks(): ConsumableInventoryTaskSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         t.*,
         COUNT(e.id) AS total_entries,
         SUM(CASE WHEN e.status = 'recorded' THEN 1 ELSE 0 END) AS recorded_entries,
         SUM(
           CASE
             WHEN IFNULL(e.variance_quantity, 0) != 0
               OR IFNULL(e.variance_reserved, 0) != 0
             THEN 1
             ELSE 0
           END
         ) AS variance_entries
        FROM consumable_inventory_tasks t
        LEFT JOIN consumable_inventory_entries e ON e.task_id = t.id
        GROUP BY t.id
        ORDER BY datetime(t.created_at) DESC`,
    )
    .all() as TaskWithStatsRow[];

  return rows.map(mapSummary);
}

export function getConsumableInventoryTask(
  id: string,
): ConsumableInventoryTaskDetail | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM consumable_inventory_tasks WHERE id = ? LIMIT 1`)
    .get(id) as TaskRow | undefined;
  if (!row) {
    return null;
  }
  const entries = db
    .prepare(
      `SELECT * FROM consumable_inventory_entries
        WHERE task_id = ?
        ORDER BY consumable_name`,
    )
    .all(id) as EntryRow[];
  const mappedEntries = entries.map(mapEntry);
  const stats = buildEntriesSummary(mappedEntries);
  return {
    ...mapTask(row),
    entries: mappedEntries,
    stats,
  };
}

export function createConsumableInventoryTask(
  payload: CreateConsumableInventoryTaskPayload,
): ConsumableInventoryTaskDetail {
  const db = getDb();
  const id = `CINV-${randomUUID().slice(0, 6).toUpperCase()}`;
  const filters = payload.filters ?? undefined;

  const insertTask = db.prepare(
    `INSERT INTO consumable_inventory_tasks (
        id,
        name,
        scope,
        filters,
        owner,
        status,
        description,
        created_at,
        updated_at
      ) VALUES (
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
  );

  db.transaction(() => {
    insertTask.run({
      id,
      name: payload.name,
      scope: payload.scope ?? null,
      filters: filters ? JSON.stringify(filters) : null,
      owner: payload.owner ?? null,
      status: payload.status ?? "draft",
      description: payload.description ?? null,
    });
    insertInventoryEntries(id, filters);
  })();

  return getConsumableInventoryTask(id)!;
}

function updateEntryRecord(
  entryId: string,
  taskId: string,
  payload: {
    actualQuantity?: number | null;
    actualReserved?: number | null;
    note?: string | null;
  },
) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM consumable_inventory_entries WHERE id = ? LIMIT 1`,
    )
    .get(entryId) as EntryRow | undefined;
  if (!row) {
    throw new Error("盘点记录不存在");
  }
  if (row.task_id !== taskId) {
    throw new Error("记录不属于当前盘点任务");
  }

  const actualQuantity =
    typeof payload.actualQuantity === "number"
      ? Math.floor(payload.actualQuantity)
      : payload.actualQuantity ?? null;
  const actualReserved =
    typeof payload.actualReserved === "number"
      ? Math.floor(payload.actualReserved)
      : payload.actualReserved ?? null;

  const varianceQuantity =
    actualQuantity === null || actualQuantity === undefined
      ? null
      : actualQuantity - row.expected_quantity;
  const varianceReserved =
    actualReserved === null || actualReserved === undefined
      ? null
      : actualReserved - row.expected_reserved;

  const status =
    actualQuantity === null &&
    actualReserved === null &&
    (payload.note === undefined || payload.note === null)
      ? row.status
      : "recorded";

  db.prepare(
    `UPDATE consumable_inventory_entries
       SET actual_quantity = @actualQuantity,
           actual_reserved = @actualReserved,
           variance_quantity = @varianceQuantity,
           variance_reserved = @varianceReserved,
           note = @note,
           status = @status,
           updated_at = datetime('now')
     WHERE id = @id`,
  ).run({
    id: entryId,
    actualQuantity,
    actualReserved,
    varianceQuantity,
    varianceReserved,
    note:
      typeof payload.note === "string" && payload.note.trim().length > 0
        ? payload.note.trim()
        : null,
    status,
  });
}

function ensureTaskStatus(
  id: string,
  status: ConsumableInventoryTaskStatus,
) {
  const db = getDb();
  db.prepare(
    `UPDATE consumable_inventory_tasks
        SET status = @status,
            updated_at = datetime('now')
      WHERE id = @id`,
  ).run({ id, status });
}

function refreshTaskStatus(id: string) {
  const db = getDb();
  const pending = db
    .prepare(
      `SELECT COUNT(1) as count
         FROM consumable_inventory_entries
        WHERE task_id = ?
          AND status = 'pending'`,
    )
    .get(id) as { count: number };
  if (pending.count === 0) {
    ensureTaskStatus(id, "completed");
  }
}

export function updateConsumableInventoryTask(
  id: string,
  payload: UpdateConsumableInventoryTaskPayload,
): ConsumableInventoryTaskDetail | null {
  const existing = getConsumableInventoryTask(id);
  if (!existing) {
    return null;
  }

  const db = getDb();
  const shouldRefresh =
    (payload.entries?.length ?? 0) > 0 && payload.status !== "completed";
  db.transaction(() => {
    payload.entries?.forEach((entry) => {
      updateEntryRecord(entry.id, id, {
        actualQuantity: entry.actualQuantity,
        actualReserved: entry.actualReserved,
        note: entry.note,
      });
    });

    if (payload.status && payload.status !== existing.status) {
      ensureTaskStatus(id, payload.status);
    }
  })();

  if (shouldRefresh) {
    refreshTaskStatus(id);
  }

  return getConsumableInventoryTask(id);
}


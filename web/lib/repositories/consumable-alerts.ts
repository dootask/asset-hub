import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  ConsumableAlert,
  ConsumableAlertLevel,
  ConsumableAlertStatus,
} from "@/lib/types/consumable-alert";
import type { ConsumableStatus } from "@/lib/types/consumable";
import {
  createConsumableAlertTodo,
  resolveConsumableAlertTodo,
} from "@/lib/integrations/dootask-todos";

type AlertRow = {
  id: string;
  consumable_id: string;
  consumable_name: string;
  keeper: string | null;
  level: ConsumableAlertLevel;
  status: ConsumableAlertStatus;
  message: string | null;
  quantity: number;
  reserved_quantity: number;
  external_todo_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type ConsumableAlertSyncResult = {
  created?: ConsumableAlert | null;
  resolved?: ConsumableAlert[];
};

type AlertSnapshot = {
  consumableId: string;
  consumableName: string;
  keeper?: string | null;
  status: ConsumableStatus;
  quantity: number;
  reservedQuantity: number;
};

function getAlertRowById(id: string) {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM consumable_alerts WHERE id = ? LIMIT 1`)
    .get(id) as AlertRow | undefined;
}

function mapRow(row: AlertRow): ConsumableAlert {
  return {
    id: row.id,
    consumableId: row.consumable_id,
    consumableName: row.consumable_name,
    keeper: row.keeper,
    level: row.level,
    status: row.status,
    message: row.message,
    quantity: row.quantity,
    reservedQuantity: row.reserved_quantity,
    externalTodoId: row.external_todo_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

function buildAlertMessage(level: ConsumableAlertLevel, snapshot: AlertSnapshot) {
  if (level === "out-of-stock") {
    return `当前库存 ${snapshot.quantity}，耗材已缺货。`;
  }
  return `库存低于安全阈值，当前库存 ${snapshot.quantity}，预留 ${snapshot.reservedQuantity}。`;
}

function getOpenAlert(consumableId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM consumable_alerts
        WHERE consumable_id = ?
          AND status = 'open'
        LIMIT 1`,
    )
    .get(consumableId) as AlertRow | undefined;
}

function insertAlert(level: ConsumableAlertLevel, snapshot: AlertSnapshot) {
  const db = getDb();
  const id = `CAL-${randomUUID().slice(0, 8).toUpperCase()}`;
  db.prepare(
    `INSERT INTO consumable_alerts (
        id,
        consumable_id,
        consumable_name,
        keeper,
        level,
        status,
        message,
        quantity,
        reserved_quantity,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @consumable_id,
        @consumable_name,
        @keeper,
        @level,
        'open',
        @message,
        @quantity,
        @reserved_quantity,
        datetime('now'),
        datetime('now')
      )`,
  ).run({
    id,
    consumable_id: snapshot.consumableId,
    consumable_name: snapshot.consumableName,
    keeper: snapshot.keeper ?? null,
    level,
    message: buildAlertMessage(level, snapshot),
    quantity: snapshot.quantity,
    reserved_quantity: snapshot.reservedQuantity,
  });
  return getAlertById(id)!;
}

function updateAlert(row: AlertRow, level: ConsumableAlertLevel, snapshot: AlertSnapshot) {
  const db = getDb();
  db.prepare(
    `UPDATE consumable_alerts
        SET level = @level,
            message = @message,
            quantity = @quantity,
            reserved_quantity = @reserved_quantity,
            updated_at = datetime('now')
      WHERE id = @id`,
  ).run({
    id: row.id,
    level,
    message: buildAlertMessage(level, snapshot),
    quantity: snapshot.quantity,
    reserved_quantity: snapshot.reservedQuantity,
  });
  return getAlertById(row.id)!;
}

function resolveAlertRow(row: AlertRow) {
  const db = getDb();
  db.prepare(
    `UPDATE consumable_alerts
        SET status = 'resolved',
            resolved_at = datetime('now'),
            updated_at = datetime('now')
      WHERE id = @id`,
  ).run({ id: row.id });
  return getAlertById(row.id)!;
}

export function getAlertById(id: string): ConsumableAlert | null {
  const row = getAlertRowById(id);
  return row ? mapRow(row) : null;
}

export function listConsumableAlerts(filters?: {
  status?: ConsumableAlertStatus[];
}) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters?.status?.length) {
    const limited = filters.status.slice(0, 5);
    conditions.push(
      `status IN (${limited.map((_, index) => `@status${index}`).join(", ")})`,
    );
    limited.forEach((status, index) => {
      params[`status${index}`] = status;
    });
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT * FROM consumable_alerts
        ${where}
        ORDER BY
          status = 'open' DESC,
          datetime(created_at) DESC`,
    )
    .all(params) as AlertRow[];

  return rows.map(mapRow);
}

export function syncConsumableAlertSnapshot(
  snapshot: AlertSnapshot,
): ConsumableAlertSyncResult | null {
  const level: ConsumableAlertLevel | null =
    snapshot.status === "low-stock"
      ? "low-stock"
      : snapshot.status === "out-of-stock"
        ? "out-of-stock"
        : null;

  if (!level) {
    const resolved = resolveAlertsForConsumable(snapshot.consumableId);
    return resolved.length ? { resolved } : null;
  }

  const existingRow = getOpenAlert(snapshot.consumableId);
  if (existingRow) {
    updateAlert(existingRow, level, snapshot);
    return null;
  }

  const created = insertAlert(level, snapshot);
  return { created };
}

export function resolveAlertsForConsumable(consumableId: string) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM consumable_alerts
        WHERE consumable_id = ?
          AND status = 'open'`,
    )
    .all(consumableId) as AlertRow[];

  if (!rows.length) {
    return [];
  }

  return rows.map((row) => resolveAlertRow(row));
}

export function resolveConsumableAlertById(id: string) {
  const row = getAlertRowById(id);
  if (!row || row.status === "resolved") {
    return null;
  }
  return resolveAlertRow(row);
}

export function setConsumableAlertExternalTodo(alertId: string, externalId: string) {
  const db = getDb();
  db.prepare(
    `UPDATE consumable_alerts
        SET external_todo_id = @externalId,
            updated_at = datetime('now')
      WHERE id = @id`,
  ).run({ id: alertId, externalId });
}

export async function propagateConsumableAlertResult(
  result: ConsumableAlertSyncResult | null,
) {
  if (!result) return;
  if (result.created) {
    const todoId = await createConsumableAlertTodo(result.created);
    if (todoId) {
      setConsumableAlertExternalTodo(result.created.id, todoId);
    }
  }

  if (result.resolved?.length) {
    await Promise.all(
      result.resolved
        .filter((alert) => alert.externalTodoId)
        .map((alert) => resolveConsumableAlertTodo(alert)),
    );
  }
}

export async function propagateAlertResolution(alert: ConsumableAlert | null) {
  if (!alert) return;
  if (alert.externalTodoId) {
    await resolveConsumableAlertTodo(alert);
  }
}


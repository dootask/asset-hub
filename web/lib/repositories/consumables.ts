import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  Consumable,
  ConsumableStatus,
  CreateConsumablePayload,
} from "@/lib/types/consumable";
import {
  propagateConsumableAlertResult,
  resolveAlertsForConsumable,
  syncConsumableAlertSnapshot,
} from "@/lib/repositories/consumable-alerts";

type ConsumableRow = {
  id: string;
  name: string;
  category: string;
  status: string;
  quantity: number;
  reserved_quantity: number;
  unit: string;
  keeper: string;
  location: string;
  safety_stock: number;
  description: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ConsumableRow): Consumable {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status as ConsumableStatus,
    quantity: row.quantity,
    reservedQuantity: row.reserved_quantity,
    unit: row.unit,
    keeper: row.keeper,
    location: row.location,
    safetyStock: row.safety_stock,
    description: row.description ?? undefined,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
  };
}

export interface ConsumableQuery {
  search?: string;
  status?: ConsumableStatus[];
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface ConsumableListResult {
  items: Consumable[];
  total: number;
  page: number;
  pageSize: number;
}

export function listConsumables(query: ConsumableQuery = {}): ConsumableListResult {
  const db = getDb();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (query.search) {
    where.push(
      "(name LIKE @search OR keeper LIKE @search OR location LIKE @search OR id LIKE @search)",
    );
    params.search = `%${query.search.trim()}%`;
  }

  if (query.category) {
    where.push("category = @category");
    params.category = query.category;
  }

  if (query.status && query.status.length > 0) {
    const limited = query.status.slice(0, 5);
    const placeholders = limited.map((_, idx) => `@status${idx}`);
    where.push(`status IN (${placeholders.join(", ")})`);
    limited.forEach((status, idx) => {
      params[`status${idx}`] = status;
    });
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = db
    .prepare(`SELECT COUNT(1) as count FROM consumables ${whereClause}`)
    .get(params) as { count: number };

  const rows = db
    .prepare(
      `SELECT * FROM consumables
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({
      ...params,
      limit: pageSize,
      offset,
    }) as ConsumableRow[];

  return {
    items: rows.map(mapRow),
    total: totalRow.count,
    page,
    pageSize,
  };
}

export function getConsumableById(id: string): Consumable | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM consumables WHERE id = ?`).get(id) as
    | ConsumableRow
    | undefined;
  return row ? mapRow(row) : null;
}

export function createConsumable(
  payload: CreateConsumablePayload,
): Consumable {
  const db = getDb();
  const id = `CON-${randomUUID().slice(0, 6).toUpperCase()}`;
  db.prepare(
    `INSERT INTO consumables (
        id,
        name,
        category,
        status,
        quantity,
        reserved_quantity,
        unit,
        keeper,
        location,
        safety_stock,
        description,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @name,
        @category,
        @status,
        @quantity,
        @reserved_quantity,
        @unit,
        @keeper,
        @location,
        @safety_stock,
        @description,
        @metadata,
        datetime('now'),
        datetime('now')
      )`,
  ).run({
    id,
    name: payload.name,
    category: payload.category,
    status: payload.status,
    quantity: payload.quantity,
    reserved_quantity: payload.reservedQuantity ?? 0,
    unit: payload.unit,
    keeper: payload.keeper,
    location: payload.location,
    safety_stock: payload.safetyStock,
    description: payload.description ?? null,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
  });
  const created = getConsumableById(id)!;
  void propagateConsumableAlertResult(
    syncConsumableAlertSnapshot({
      consumableId: created.id,
      consumableName: created.name,
      keeper: created.keeper,
      status: created.status,
      quantity: created.quantity,
      reservedQuantity: created.reservedQuantity,
    }),
  );
  return created;
}

export function updateConsumable(
  id: string,
  payload: CreateConsumablePayload,
): Consumable | null {
  const db = getDb();
  const existing = getConsumableById(id);
  if (!existing) return null;
  db.prepare(
    `UPDATE consumables
     SET name=@name,
         category=@category,
         status=@status,
         quantity=@quantity,
         reserved_quantity=@reserved_quantity,
         unit=@unit,
         keeper=@keeper,
         location=@location,
         safety_stock=@safety_stock,
         description=@description,
         metadata=@metadata,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    name: payload.name,
    category: payload.category,
    status: payload.status,
    quantity: payload.quantity,
    reserved_quantity: payload.reservedQuantity ?? existing.reservedQuantity,
    unit: payload.unit,
    keeper: payload.keeper,
    location: payload.location,
    safety_stock: payload.safetyStock,
    description: payload.description ?? null,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
  });
  const updated = getConsumableById(id);
  if (updated) {
    void propagateConsumableAlertResult(
      syncConsumableAlertSnapshot({
        consumableId: updated.id,
        consumableName: updated.name,
        keeper: updated.keeper,
        status: updated.status,
        quantity: updated.quantity,
        reservedQuantity: updated.reservedQuantity,
      }),
    );
  }
  return updated;
}

export function deleteConsumable(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM consumables WHERE id = ?`).run(id);
  if (result.changes > 0) {
    const resolvedAlerts = resolveAlertsForConsumable(id);
    if (resolvedAlerts.length) {
      void propagateConsumableAlertResult({ resolved: resolvedAlerts });
    }
  }
  return result.changes > 0;
}

export function getConsumableStockStats() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT status, COUNT(1) as total
         FROM consumables
        GROUP BY status`,
    )
    .all() as { status: string; total: number }[];

  const stats = {
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    reserved: 0,
    archived: 0,
  };

  rows.forEach((row) => {
    stats.total += row.total;
    const status = row.status as ConsumableStatus;
    switch (status) {
      case "in-stock":
        stats.inStock += row.total;
        break;
      case "low-stock":
        stats.lowStock += row.total;
        break;
      case "out-of-stock":
        stats.outOfStock += row.total;
        break;
      case "reserved":
        stats.reserved += row.total;
        break;
      case "archived":
        stats.archived += row.total;
        break;
      default:
        break;
    }
  });

  return stats;
}


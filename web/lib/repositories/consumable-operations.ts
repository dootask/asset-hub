import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  ConsumableOperation,
  ConsumableOperationAuditEntry,
  ConsumableOperationStatus,
  ConsumableOperationType,
  CreateConsumableOperationPayload,
} from "@/lib/types/consumable-operation";
import type { ConsumableStatus } from "@/lib/types/consumable";
import {
  propagateConsumableAlertResult,
  syncConsumableAlertSnapshot,
} from "@/lib/repositories/consumable-alerts";

type OperationRow = {
  id: string;
  consumable_id: string;
  type: ConsumableOperationType;
  description: string | null;
  actor: string;
  status: ConsumableOperationStatus;
  quantity_delta: number;
  reserved_delta: number;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

type ConsumableStockRow = {
  id: string;
  name: string;
  quantity: number;
  reserved_quantity: number;
  safety_stock: number;
  status: string;
  keeper: string | null;
};

type ConsumableOperationAuditRow = OperationRow & {
  consumable_name: string;
  consumable_category: string;
  consumable_status: string;
  keeper: string | null;
  location: string | null;
};

export interface ConsumableOperationAuditQuery {
  types?: ConsumableOperationType[];
  statuses?: ConsumableOperationStatus[];
  consumableId?: string;
  keeper?: string;
  actor?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ConsumableOperationAuditSummary {
  totalOperations: number;
  pendingOperations: number;
  inboundQuantity: number;
  outboundQuantity: number;
  netQuantity: number;
}

export interface ConsumableOperationAuditResult {
  items: ConsumableOperationAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  summary: ConsumableOperationAuditSummary;
}

function parseMetadata(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapRow(row: OperationRow): ConsumableOperation {
  return {
    id: row.id,
    consumableId: row.consumable_id,
    type: row.type,
    description: row.description ?? "",
    actor: row.actor,
    status: row.status,
    quantityDelta: row.quantity_delta,
    reservedDelta: row.reserved_delta,
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

function mapAuditRow(row: ConsumableOperationAuditRow): ConsumableOperationAuditEntry {
  return {
    ...mapRow(row),
    consumableName: row.consumable_name,
    consumableCategory: row.consumable_category,
    consumableStatus: row.consumable_status as ConsumableStatus,
    keeper: row.keeper,
    location: row.location,
  };
}

function resolveStatusFromStock({
  currentStatus,
  quantity,
  reservedQuantity,
  safetyStock,
}: {
  currentStatus: ConsumableStatus;
  quantity: number;
  reservedQuantity: number;
  safetyStock: number;
}): ConsumableStatus {
  if (currentStatus === "archived") {
    return "archived";
  }

  if (quantity <= 0) {
    return "out-of-stock";
  }

  if (reservedQuantity >= quantity) {
    return "reserved";
  }

  if (safetyStock > 0 && quantity <= safetyStock) {
    return "low-stock";
  }

  return "in-stock";
}

function applyOperationEffects(row: OperationRow) {
  const db = getDb();
  const stock = db
    .prepare(
      `SELECT id,
              name,
              quantity,
              reserved_quantity,
              safety_stock,
              status,
              keeper
         FROM consumables
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(row.consumable_id) as ConsumableStockRow | undefined;

  if (!stock) {
    throw new Error(
      `Consumable ${row.consumable_id} not found when applying operation`,
    );
  }

  const nextQuantity = stock.quantity + row.quantity_delta;
  if (nextQuantity < 0) {
    throw new Error("耗材库存不足，无法完成本次操作");
  }

  const nextReserved = stock.reserved_quantity + row.reserved_delta;
  if (nextReserved < 0) {
    throw new Error("耗材预留数量不可为负");
  }

  if (nextReserved > nextQuantity) {
    throw new Error("预留数量不可超过当前库存");
  }

  const nextStatus = resolveStatusFromStock({
    currentStatus: stock.status as ConsumableStatus,
    quantity: nextQuantity,
    reservedQuantity: nextReserved,
    safetyStock: stock.safety_stock,
  });

  db
    .prepare(
      `UPDATE consumables
          SET quantity = @quantity,
              reserved_quantity = @reserved_quantity,
              status = @status,
              updated_at = datetime('now')
        WHERE id = @id AND deleted_at IS NULL`,
    )
    .run({
      id: stock.id,
      quantity: nextQuantity,
      reserved_quantity: nextReserved,
      status: nextStatus,
    });

  void propagateConsumableAlertResult(
    syncConsumableAlertSnapshot({
      consumableId: stock.id,
      consumableName: stock.name,
      keeper: stock.keeper ?? undefined,
      status: nextStatus,
      quantity: nextQuantity,
      reservedQuantity: nextReserved,
    }),
  );
}

function getOperationRow(operationId: string): OperationRow | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM consumable_operations WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(operationId) as OperationRow | undefined;
}

export function listOperationsForConsumable(
  consumableId: string,
): ConsumableOperation[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM consumable_operations
        WHERE consumable_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC`,
    )
    .all(consumableId) as OperationRow[];

  return rows.map(mapRow);
}

function buildAuditFilters(query: ConsumableOperationAuditQuery) {
  const where: string[] = ["co.deleted_at IS NULL", "c.deleted_at IS NULL"];
  const params: Record<string, unknown> = {};

  if (query.types?.length) {
    const limited = query.types.slice(0, 8);
    const placeholders = limited.map((_, index) => `@type${index}`);
    where.push(`co.type IN (${placeholders.join(", ")})`);
    limited.forEach((type, index) => {
      params[`type${index}`] = type;
    });
  }

  if (query.statuses?.length) {
    const limited = query.statuses.slice(0, 8);
    const placeholders = limited.map((_, index) => `@status${index}`);
    where.push(`co.status IN (${placeholders.join(", ")})`);
    limited.forEach((status, index) => {
      params[`status${index}`] = status;
    });
  }

  if (query.consumableId) {
    where.push("co.consumable_id = @consumableId");
    params.consumableId = query.consumableId;
  }

  if (query.keeper) {
    where.push("c.keeper LIKE @keeper");
    params.keeper = `%${query.keeper.trim()}%`;
  }

  if (query.actor) {
    where.push("co.actor LIKE @actor");
    params.actor = `%${query.actor.trim()}%`;
  }

  if (query.keyword) {
    where.push(
      "(c.name LIKE @keyword OR co.description LIKE @keyword OR co.id LIKE @keyword)",
    );
    params.keyword = `%${query.keyword.trim()}%`;
  }

  if (query.dateFrom) {
    where.push("datetime(co.created_at) >= datetime(@dateFrom)");
    params.dateFrom = query.dateFrom;
  }

  if (query.dateTo) {
    where.push("datetime(co.created_at) <= datetime(@dateTo)");
    params.dateTo = query.dateTo;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  return { whereClause, params };
}

function extractAuditSummary(row?: {
  totalOperations?: number | null;
  pendingOperations?: number | null;
  inboundQuantity?: number | null;
  outboundQuantity?: number | null;
  netQuantity?: number | null;
}): ConsumableOperationAuditSummary {
  return {
    totalOperations: row?.totalOperations ?? 0,
    pendingOperations: row?.pendingOperations ?? 0,
    inboundQuantity: row?.inboundQuantity ?? 0,
    outboundQuantity: row?.outboundQuantity ?? 0,
    netQuantity: row?.netQuantity ?? 0,
  };
}

export function queryConsumableOperations(
  query: ConsumableOperationAuditQuery = {},
  options?: { all?: boolean },
): ConsumableOperationAuditResult {
  const db = getDb();
  const shouldPaginate = options?.all !== true;
  const page = Math.max(1, query.page ?? 1);
  const pageSize = shouldPaginate
    ? Math.min(200, Math.max(1, query.pageSize ?? 20))
    : Math.max(query.pageSize ?? 20, 1);
  const offset = (page - 1) * pageSize;

  const { whereClause, params } = buildAuditFilters(query);
  const baseFrom = `
    FROM consumable_operations co
    JOIN consumables c ON c.id = co.consumable_id
    ${whereClause}
  `;

  const totalRow = db
    .prepare(`SELECT COUNT(1) as count ${baseFrom}`)
    .get(params) as { count: number } | undefined;

  const summaryRow = db
    .prepare(
      `SELECT
          COUNT(1) as totalOperations,
          SUM(CASE WHEN co.status = 'pending' THEN 1 ELSE 0 END) as pendingOperations,
          SUM(CASE WHEN co.quantity_delta > 0 THEN co.quantity_delta ELSE 0 END) as inboundQuantity,
          SUM(CASE WHEN co.quantity_delta < 0 THEN ABS(co.quantity_delta) ELSE 0 END) as outboundQuantity,
          SUM(co.quantity_delta) as netQuantity
        ${baseFrom}`,
    )
    .get(params) as
    | {
        totalOperations: number;
        pendingOperations: number;
        inboundQuantity: number;
        outboundQuantity: number;
        netQuantity: number;
      }
    | undefined;

  const selectSql = `
    SELECT
      co.*,
      c.name as consumable_name,
      c.category as consumable_category,
      c.status as consumable_status,
      c.keeper,
      c.location
    ${baseFrom}
    ORDER BY datetime(co.created_at) DESC
    ${shouldPaginate ? "LIMIT @limit OFFSET @offset" : ""}
  `;

  const rows = db
    .prepare(selectSql)
    .all(
      shouldPaginate
        ? { ...params, limit: pageSize, offset }
        : params,
    ) as ConsumableOperationAuditRow[];

  const summary = extractAuditSummary(summaryRow);

  return {
    items: rows.map(mapAuditRow),
    total: totalRow?.count ?? rows.length,
    page: shouldPaginate ? page : 1,
    pageSize: shouldPaginate ? pageSize : rows.length || pageSize,
    summary,
  };
}

export function getConsumableOperationById(
  operationId: string,
): ConsumableOperation | null {
  const row = getOperationRow(operationId);
  return row ? mapRow(row) : null;
}

export function createConsumableOperation(
  consumableId: string,
  payload: CreateConsumableOperationPayload,
): ConsumableOperation {
  const db = getDb();
  const id = `COP-${randomUUID().slice(0, 8).toUpperCase()}`;
  const status: ConsumableOperationStatus = payload.status ?? "done";
  const quantityDelta = payload.quantityDelta ?? 0;
  const reservedDelta = payload.reservedDelta ?? 0;

  const insertPayload = {
    id,
    consumable_id: consumableId,
    type: payload.type,
    description: payload.description ?? "",
    actor: payload.actor,
    status,
    quantity_delta: quantityDelta,
    reserved_delta: reservedDelta,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
  };

  try {
    db.prepare(
      `INSERT INTO consumable_operations (
        id,
        consumable_id,
        type,
        description,
        actor,
        status,
        quantity_delta,
        reserved_delta,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @consumable_id,
        @type,
        @description,
        @actor,
        @status,
        @quantity_delta,
        @reserved_delta,
        @metadata,
        datetime('now'),
        datetime('now')
      )`,
    ).run(insertPayload);

    const inserted = getOperationRow(id)!;

    if (status === "done") {
      applyOperationEffects(inserted);
    }

    return mapRow(inserted);
  } catch (error) {
    db.prepare(`DELETE FROM consumable_operations WHERE id = ?`).run(id);
    throw error;
  }
}

export function updateConsumableOperationStatus(
  operationId: string,
  status: ConsumableOperationStatus,
): ConsumableOperation | null {
  const db = getDb();
  const existing = getOperationRow(operationId);
  if (!existing) return null;

  if (existing.status === status) {
    return mapRow(existing);
  }

  if (existing.status === "done" && status !== "done") {
    throw new Error("已完成的耗材操作无法回退状态");
  }

  try {
    db.prepare(
      `UPDATE consumable_operations
          SET status = @status,
              updated_at = datetime('now')
        WHERE id = @id AND deleted_at IS NULL`,
    ).run({ status, id: operationId });

    const updatedRow = getOperationRow(operationId)!;

    if (existing.status !== "done" && status === "done") {
      applyOperationEffects(updatedRow);
    }

    return mapRow(updatedRow);
  } catch (error) {
    db.prepare(
      `UPDATE consumable_operations
          SET status = @status,
              updated_at = datetime('now')
        WHERE id = @id`,
    ).run({ status: existing.status, id: operationId });
    throw error;
  }
}

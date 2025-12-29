import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  Consumable,
  ConsumableStatus,
  CreateConsumablePayload,
} from "@/lib/types/consumable";
import { getConsumableCategoryByCode } from "@/lib/repositories/consumable-categories";
import {
  propagateConsumableAlertResult,
  resolveAlertsForConsumable,
  syncConsumableAlertSnapshot,
} from "@/lib/repositories/consumable-alerts";

type ConsumableRow = {
  id: string;
  consumable_no: string | null;
  name: string;
  spec_model: string | null;
  category: string;
  status: string;
  company_code: string | null;
  quantity: number;
  reserved_quantity: number;
  unit: string;
  keeper: string;
  location: string;
  safety_stock: number;
  purchase_price_cents: number | null;
  purchase_currency: string | null;
  description: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;
  restored_at: string | null;
  restored_by: string | null;
};

const CONSUMABLE_NO_MAX_LENGTH = 64;
const DELETE_SUFFIX_PATTERN = /_delete_[a-z0-9]{6}$/i;

function mapRow(row: ConsumableRow): Consumable {
  return {
    id: row.id,
    consumableNo: row.consumable_no ?? undefined,
    name: row.name,
    specModel: row.spec_model ?? undefined,
    category: row.category,
    status: row.status as ConsumableStatus,
    companyCode: row.company_code ?? undefined,
    quantity: row.quantity,
    reservedQuantity: row.reserved_quantity,
    unit: row.unit,
    keeper: row.keeper,
    location: row.location,
    safetyStock: row.safety_stock,
    purchasePriceCents:
      typeof row.purchase_price_cents === "number"
        ? row.purchase_price_cents
        : undefined,
    purchaseCurrency: row.purchase_currency ?? undefined,
    description: row.description ?? undefined,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
    deletedAt: row.deleted_at ?? undefined,
    deletedBy: row.deleted_by ?? undefined,
    deleteReason: row.delete_reason ?? undefined,
    restoredAt: row.restored_at ?? undefined,
    restoredBy: row.restored_by ?? undefined,
  };
}

function getConsumableRowById(
  id: string,
  includeDeleted = false,
): ConsumableRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM consumables WHERE id = ?${includeDeleted ? "" : " AND deleted_at IS NULL"}`,
    )
    .get(id) as ConsumableRow | undefined;
  return row ?? null;
}

function appendDeleteSuffix(
  value: string,
  maxLength = CONSUMABLE_NO_MAX_LENGTH,
): string {
  const suffix = `_delete_${randomUUID().slice(0, 6).toLowerCase()}`;
  const available = Math.max(0, maxLength - suffix.length);
  const base = value.length > available ? value.slice(0, available) : value;
  return `${base}${suffix}`;
}

function stripDeleteSuffix(value: string): string {
  return value.replace(DELETE_SUFFIX_PATTERN, "");
}

function appendRestoreSuffix(
  value: string,
  maxLength = CONSUMABLE_NO_MAX_LENGTH,
): string {
  const suffix = `_${randomUUID().slice(0, 6).toLowerCase()}`;
  const available = Math.max(0, maxLength - suffix.length);
  const base = value.length > available ? value.slice(0, available) : value;
  return `${base}${suffix}`;
}

export interface ConsumableQuery {
  search?: string;
  status?: ConsumableStatus[];
  category?: string;
  companyCode?: string;
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

  const where: string[] = ["deleted_at IS NULL"];
  const params: Record<string, unknown> = {};

  if (query.search) {
    where.push(
      "(name LIKE @search OR keeper LIKE @search OR location LIKE @search OR id LIKE @search OR consumable_no LIKE @search OR spec_model LIKE @search)",
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

  if (query.companyCode) {
    where.push("company_code = @companyCode");
    params.companyCode = query.companyCode;
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

export function listDeletedConsumables(
  query: ConsumableQuery = {},
): ConsumableListResult {
  const db = getDb();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const where: string[] = ["deleted_at IS NOT NULL"];
  const params: Record<string, unknown> = {};

  if (query.search) {
    where.push(
      "(name LIKE @search OR keeper LIKE @search OR location LIKE @search OR id LIKE @search OR consumable_no LIKE @search OR spec_model LIKE @search)",
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

  if (query.companyCode) {
    where.push("company_code = @companyCode");
    params.companyCode = query.companyCode;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = db
    .prepare(`SELECT COUNT(1) as count FROM consumables ${whereClause}`)
    .get(params) as { count: number };

  const rows = db
    .prepare(
      `SELECT * FROM consumables
       ${whereClause}
       ORDER BY deleted_at DESC
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
  const row = getConsumableRowById(id);
  return row ? mapRow(row) : null;
}

export function getConsumableByIdIncludingDeleted(id: string): Consumable | null {
  const row = getConsumableRowById(id, true);
  return row ? mapRow(row) : null;
}

export function isConsumableNoInUse(consumableNo: string, excludeId?: string): boolean {
  const normalized = consumableNo.trim();
  if (!normalized) return false;
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT id FROM consumables
      WHERE consumable_no = @consumableNo
        AND deleted_at IS NULL
        AND (@excludeId IS NULL OR id <> @excludeId)
      LIMIT 1
    `,
    )
    .get({ consumableNo: normalized, excludeId: excludeId ?? null }) as
    | { id: string }
    | undefined;
  return Boolean(row?.id);
}

function normalizeCategoryPrefix(prefix: string | null | undefined): string | null {
  if (!prefix) return null;
  const normalized = prefix.trim().toUpperCase();
  if (!normalized) return null;
  return /^[A-Z0-9]{1,10}$/.test(normalized) ? normalized : null;
}

function nextConsumableNoSeq(prefix: string): number {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO consumable_no_counters(prefix, next_seq)
      VALUES (@prefix, 1)
      ON CONFLICT(prefix) DO NOTHING
    `,
    ).run({ prefix });

    const likePattern = `${prefix}-%`;
    const start = prefix.length + 2;
    const maxRow = db
      .prepare(
        `
        SELECT MAX(CAST(SUBSTR(consumable_no, @start) AS INTEGER)) as maxSeq
        FROM consumables
        WHERE consumable_no LIKE @likePattern
          AND SUBSTR(consumable_no, @start) GLOB '[0-9]*'
          AND deleted_at IS NULL
      `,
      )
      .get({ likePattern, start }) as { maxSeq: number | null } | undefined;
    const minNextSeq = (maxRow?.maxSeq ?? 0) + 1;

    db.prepare(
      `
      UPDATE consumable_no_counters
      SET next_seq = CASE WHEN next_seq < @minNextSeq THEN @minNextSeq ELSE next_seq END
      WHERE prefix = @prefix
    `,
    ).run({ prefix, minNextSeq });

    const row = db
      .prepare("SELECT next_seq FROM consumable_no_counters WHERE prefix = ?")
      .get(prefix) as { next_seq: number } | undefined;
    const current = row?.next_seq ?? minNextSeq;

    db.prepare(
      "UPDATE consumable_no_counters SET next_seq = next_seq + 1 WHERE prefix = ?",
    ).run(prefix);

    return current;
  });
  return transaction();
}

function formatPrefixedConsumableNo(prefix: string, seq: number): string {
  const padded = String(Math.max(0, seq)).padStart(6, "0");
  return `${prefix}-${padded}`;
}

function resolveConsumableNoForCreate(
  payload: CreateConsumablePayload,
  fallbackId: string,
): string {
  const raw = payload.consumableNo?.trim() ?? "";
  if (raw) {
    return raw;
  }

  const category = getConsumableCategoryByCode(payload.category);
  const prefix = normalizeCategoryPrefix(category?.consumableNoPrefix);
  if (!prefix) {
    return fallbackId;
  }

  const seq = nextConsumableNoSeq(prefix);
  return formatPrefixedConsumableNo(prefix, seq);
}

export function createConsumable(
  payload: CreateConsumablePayload,
): Consumable {
  const db = getDb();
  const id = `CON-${randomUUID().slice(0, 6).toUpperCase()}`;
  const consumableNo = resolveConsumableNoForCreate(payload, id);
  const specModel = payload.specModel?.trim() ? payload.specModel.trim() : null;
  const purchasePriceCents =
    typeof payload.purchasePriceCents === "number"
      ? payload.purchasePriceCents
      : null;
  const purchaseCurrency = payload.purchaseCurrency?.trim() || "CNY";
  db.prepare(
    `INSERT INTO consumables (
        id,
        consumable_no,
        name,
        spec_model,
        category,
        status,
        company_code,
        quantity,
        reserved_quantity,
        unit,
        keeper,
        location,
        safety_stock,
        purchase_price_cents,
        purchase_currency,
        description,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @consumable_no,
        @name,
        @spec_model,
        @category,
        @status,
        @company_code,
        @quantity,
        @reserved_quantity,
        @unit,
        @keeper,
        @location,
        @safety_stock,
        @purchase_price_cents,
        @purchase_currency,
        @description,
        @metadata,
        datetime('now'),
        datetime('now')
      )`,
  ).run({
    id,
    consumable_no: consumableNo,
    name: payload.name,
    spec_model: specModel,
    category: payload.category,
    status: payload.status,
    company_code: payload.companyCode,
    quantity: payload.quantity,
    reserved_quantity: payload.reservedQuantity ?? 0,
    unit: payload.unit,
    keeper: payload.keeper,
    location: payload.location,
    safety_stock: payload.safetyStock,
    purchase_price_cents: purchasePriceCents,
    purchase_currency: purchaseCurrency,
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
  const consumableNo =
    payload.consumableNo === undefined
      ? existing.consumableNo ?? null
      : payload.consumableNo.trim()
        ? payload.consumableNo.trim()
        : null;
  const specModel =
    payload.specModel === undefined
      ? existing.specModel ?? null
      : payload.specModel.trim()
        ? payload.specModel.trim()
        : null;
  const purchasePriceCents =
    payload.purchasePriceCents === undefined
      ? typeof existing.purchasePriceCents === "number"
        ? existing.purchasePriceCents
        : null
      : typeof payload.purchasePriceCents === "number"
        ? payload.purchasePriceCents
        : null;
  const purchaseCurrency =
    payload.purchaseCurrency === undefined
      ? existing.purchaseCurrency ?? "CNY"
      : payload.purchaseCurrency.trim() || existing.purchaseCurrency || "CNY";
  db.prepare(
    `UPDATE consumables
     SET consumable_no=@consumable_no,
         name=@name,
         spec_model=@spec_model,
         category=@category,
         status=@status,
         company_code=@company_code,
         quantity=@quantity,
         reserved_quantity=@reserved_quantity,
         unit=@unit,
         keeper=@keeper,
         location=@location,
         safety_stock=@safety_stock,
         purchase_price_cents=@purchase_price_cents,
         purchase_currency=@purchase_currency,
         description=@description,
         metadata=@metadata,
         updated_at=datetime('now')
     WHERE id=@id AND deleted_at IS NULL`,
  ).run({
    id,
    consumable_no: consumableNo,
    name: payload.name,
    spec_model: specModel,
    category: payload.category,
    status: payload.status,
    company_code: payload.companyCode,
    quantity: payload.quantity,
    reserved_quantity: payload.reservedQuantity ?? existing.reservedQuantity,
    unit: payload.unit,
    keeper: payload.keeper,
    location: payload.location,
    safety_stock: payload.safetyStock,
    purchase_price_cents: purchasePriceCents,
    purchase_currency: purchaseCurrency,
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

export function softDeleteConsumable(
  id: string,
  payload: { deletedBy: string; deleteReason: string },
): boolean {
  const db = getDb();
  const existing = getConsumableRowById(id);
  if (!existing || existing.deleted_at) {
    return false;
  }

  const consumableNo =
    existing.consumable_no && existing.consumable_no.trim()
      ? appendDeleteSuffix(existing.consumable_no.trim(), CONSUMABLE_NO_MAX_LENGTH)
      : existing.consumable_no;

  const runDelete = db.transaction(() => {
    const result = db
      .prepare(
        `UPDATE consumables
         SET consumable_no = @consumable_no,
             deleted_at = datetime('now'),
             deleted_by = @deletedBy,
             delete_reason = @deleteReason,
             restored_at = NULL,
             restored_by = NULL,
             updated_at = datetime('now')
         WHERE id = @id AND deleted_at IS NULL`,
      )
      .run({
        id,
        consumable_no: consumableNo,
        deletedBy: payload.deletedBy,
        deleteReason: payload.deleteReason,
      });

    db.prepare(
      `UPDATE consumable_operations
       SET deleted_at = datetime('now'),
           deleted_by = @deletedBy,
           delete_reason = @deleteReason,
           restored_at = NULL,
           restored_by = NULL,
           updated_at = datetime('now')
       WHERE consumable_id = @id AND deleted_at IS NULL`,
    ).run({
      id,
      deletedBy: payload.deletedBy,
      deleteReason: payload.deleteReason,
    });

    db.prepare(
      `UPDATE asset_approval_requests
       SET deleted_at = datetime('now'),
           deleted_by = @deletedBy,
           delete_reason = @deleteReason,
           restored_at = NULL,
           restored_by = NULL,
           updated_at = datetime('now')
       WHERE consumable_id = @id AND deleted_at IS NULL`,
    ).run({
      id,
      deletedBy: payload.deletedBy,
      deleteReason: payload.deleteReason,
    });

    return result.changes > 0;
  });

  const deleted = runDelete();
  if (deleted) {
    const resolvedAlerts = resolveAlertsForConsumable(id);
    if (resolvedAlerts.length) {
      void propagateConsumableAlertResult({ resolved: resolvedAlerts });
    }
  }

  return deleted;
}

export function deleteConsumable(
  id: string,
  payload: { deletedBy: string; deleteReason: string },
): boolean {
  return softDeleteConsumable(id, payload);
}

export function restoreConsumable(
  id: string,
  restoredBy: string,
): Consumable | null {
  const db = getDb();
  const existing = getConsumableRowById(id, true);
  if (!existing || !existing.deleted_at) {
    return null;
  }

  let restoredConsumableNo =
    existing.consumable_no && existing.consumable_no.trim()
      ? stripDeleteSuffix(existing.consumable_no.trim())
      : existing.consumable_no;

  if (
    restoredConsumableNo &&
    restoredConsumableNo.trim() &&
    isConsumableNoInUse(restoredConsumableNo.trim(), id)
  ) {
    restoredConsumableNo = appendRestoreSuffix(
      restoredConsumableNo.trim(),
      CONSUMABLE_NO_MAX_LENGTH,
    );
  }

  const runRestore = db.transaction(() => {
    db.prepare(
      `UPDATE consumables
       SET consumable_no = @consumable_no,
           deleted_at = NULL,
           deleted_by = NULL,
           delete_reason = NULL,
           restored_at = datetime('now'),
           restored_by = @restoredBy,
           updated_at = datetime('now')
       WHERE id = @id`,
    ).run({
      id,
      consumable_no: restoredConsumableNo,
      restoredBy,
    });

    db.prepare(
      `UPDATE consumable_operations
       SET deleted_at = NULL,
           deleted_by = NULL,
           delete_reason = NULL,
           restored_at = datetime('now'),
           restored_by = @restoredBy,
           updated_at = datetime('now')
       WHERE consumable_id = @id AND deleted_at IS NOT NULL`,
    ).run({ id, restoredBy });

    db.prepare(
      `UPDATE asset_approval_requests
       SET deleted_at = NULL,
           deleted_by = NULL,
           delete_reason = NULL,
           restored_at = datetime('now'),
           restored_by = @restoredBy,
           updated_at = datetime('now')
       WHERE consumable_id = @id AND deleted_at IS NOT NULL`,
    ).run({ id, restoredBy });
  });

  runRestore();
  const restored = getConsumableById(id);
  if (restored) {
    void propagateConsumableAlertResult(
      syncConsumableAlertSnapshot({
        consumableId: restored.id,
        consumableName: restored.name,
        keeper: restored.keeper,
        status: restored.status,
        quantity: restored.quantity,
        reservedQuantity: restored.reservedQuantity,
      }),
    );
  }
  return restored;
}

export function permanentlyDeleteConsumable(id: string): boolean {
  const db = getDb();
  const existing = getConsumableRowById(id, true);
  if (!existing || !existing.deleted_at) {
    return false;
  }

  const runDelete = db.transaction(() => {
    const result = db
      .prepare("DELETE FROM consumables WHERE id = ? AND deleted_at IS NOT NULL")
      .run(id);

    if (result.changes > 0) {
      const resolvedAlerts = resolveAlertsForConsumable(id);
      if (resolvedAlerts.length) {
        void propagateConsumableAlertResult({ resolved: resolvedAlerts });
      }
    }

    return result.changes > 0;
  });

  return runDelete();
}

export function updateConsumablePurchasePrice(
  id: string,
  payload: { purchasePriceCents: number; purchaseCurrency?: string },
): Consumable | null {
  const db = getDb();
  const existing = getConsumableById(id);
  if (!existing) {
    return null;
  }
  const currency =
    payload.purchaseCurrency?.trim() || existing.purchaseCurrency || "CNY";

  db.prepare(
    `UPDATE consumables
     SET purchase_price_cents=@purchase_price_cents,
         purchase_currency=@purchase_currency,
         updated_at=datetime('now')
     WHERE id=@id AND deleted_at IS NULL`,
  ).run({
    id,
    purchase_price_cents: payload.purchasePriceCents,
    purchase_currency: currency,
  });

  return getConsumableById(id);
}

export function getConsumableStockStats() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT status, COUNT(1) as total
         FROM consumables
        WHERE deleted_at IS NULL
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

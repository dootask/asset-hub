import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type { Asset, CreateAssetPayload } from "@/lib/types/asset";
import { getAssetCategoryByCode } from "@/lib/repositories/asset-categories";

type AssetRow = {
  id: string;
  asset_no: string | null;
  name: string;
  spec_model: string | null;
  category: string;
  status: Asset["status"];
  company_code: string | null;
  owner: string;
  location: string;
  purchase_date: string;
  expires_at: string | null;
  note: string | null;
  purchase_price_cents: number | null;
  purchase_currency: string | null;
};

export interface AssetQuery {
  search?: string;
  status?: Asset["status"][];
  category?: string;
  companyCode?: string;
  page?: number;
  pageSize?: number;
}

export interface AssetListResult {
  items: Asset[];
  total: number;
  page: number;
  pageSize: number;
}

function mapRow(row: AssetRow): Asset {
  return {
    id: row.id,
    assetNo: row.asset_no ?? undefined,
    name: row.name,
    specModel: row.spec_model ?? undefined,
    category: row.category,
    status: row.status,
    companyCode: row.company_code ?? undefined,
    owner: row.owner,
    location: row.location,
    purchaseDate: row.purchase_date,
    expiresAt: row.expires_at ?? undefined,
    note: row.note ?? undefined,
    purchasePriceCents:
      typeof row.purchase_price_cents === "number"
        ? row.purchase_price_cents
        : undefined,
    purchaseCurrency: row.purchase_currency ?? undefined,
  };
}

export function listAssets(query: AssetQuery = {}): AssetListResult {
  const db = getDb();

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (query.search) {
    where.push(
      "(name LIKE @search OR owner LIKE @search OR id LIKE @search OR location LIKE @search OR asset_no LIKE @search OR spec_model LIKE @search)",
    );
    params.search = `%${query.search.trim()}%`;
  }

  if (query.category) {
    where.push("category = @category");
    params.category = query.category;
  }

  if (query.companyCode) {
    where.push("company_code = @companyCode");
    params.companyCode = query.companyCode;
  }

  if (query.status && query.status.length > 0) {
    const safeStatuses = query.status.slice(0, 5);
    const statusPlaceholders = safeStatuses.map((_, idx) => `@status${idx}`);
    where.push(`status IN (${statusPlaceholders.join(",")})`);
    safeStatuses.forEach((status, idx) => {
      params[`status${idx}`] = status;
    });
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = db
    .prepare(`SELECT COUNT(1) as count FROM assets ${whereClause}`)
    .get(params) as { count: number };

  const rows = db
    .prepare(
      `
      SELECT * FROM assets
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT @limit OFFSET @offset
    `,
    )
    .all({
      ...params,
      limit: pageSize,
      offset,
    }) as AssetRow[];

  return {
    items: rows.map(mapRow),
    total: total.count,
    page,
    pageSize,
  };
}

export function getAssetById(id: string): Asset | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as AssetRow | undefined;
  return row ? mapRow(row) : null;
}

export function isAssetNoInUse(assetNo: string, excludeId?: string): boolean {
  const normalized = assetNo.trim();
  if (!normalized) return false;
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT id FROM assets
      WHERE asset_no = @assetNo
      AND (@excludeId IS NULL OR id <> @excludeId)
      LIMIT 1
    `,
    )
    .get({ assetNo: normalized, excludeId: excludeId ?? null }) as
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

function nextAssetNoSeq(prefix: string): number {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO asset_no_counters(prefix, next_seq)
      VALUES (@prefix, 1)
      ON CONFLICT(prefix) DO NOTHING
    `,
    ).run({ prefix });

    const likePattern = `${prefix}-%`;
    const start = prefix.length + 2; // SQLite substr is 1-indexed; prefix + "-" then digits
    const maxRow = db
      .prepare(
        `
        SELECT MAX(CAST(SUBSTR(asset_no, @start) AS INTEGER)) as maxSeq
        FROM assets
        WHERE asset_no LIKE @likePattern
          AND SUBSTR(asset_no, @start) GLOB '[0-9]*'
      `,
      )
      .get({ likePattern, start }) as { maxSeq: number | null } | undefined;
    const minNextSeq = (maxRow?.maxSeq ?? 0) + 1;

    db.prepare(
      `
      UPDATE asset_no_counters
      SET next_seq = CASE WHEN next_seq < @minNextSeq THEN @minNextSeq ELSE next_seq END
      WHERE prefix = @prefix
    `,
    ).run({ prefix, minNextSeq });

    const row = db
      .prepare("SELECT next_seq FROM asset_no_counters WHERE prefix = ?")
      .get(prefix) as { next_seq: number } | undefined;
    const current = row?.next_seq ?? minNextSeq;

    db.prepare(
      "UPDATE asset_no_counters SET next_seq = next_seq + 1 WHERE prefix = ?",
    ).run(prefix);

    return current;
  });

  return transaction();
}

function formatPrefixedAssetNo(prefix: string, seq: number): string {
  const padded = String(Math.max(0, seq)).padStart(6, "0");
  return `${prefix}-${padded}`;
}

function resolveAssetNoForCreate(payload: CreateAssetPayload, fallbackId: string): string {
  const raw = payload.assetNo?.trim() ?? "";
  if (raw) {
    return raw;
  }

  const category = getAssetCategoryByCode(payload.category);
  const prefix = normalizeCategoryPrefix(category?.assetNoPrefix);
  if (!prefix) {
    return fallbackId;
  }

  const seq = nextAssetNoSeq(prefix);
  return formatPrefixedAssetNo(prefix, seq);
}

export function createAsset(payload: CreateAssetPayload): Asset {
  const db = getDb();
  const id = `AST-${randomUUID().slice(0, 8).toUpperCase()}`;
  const assetNo = resolveAssetNoForCreate(payload, id);
  const specModel = payload.specModel?.trim() ? payload.specModel.trim() : null;
  const expiresAtRaw = typeof payload.expiresAt === "string" ? payload.expiresAt : "";
  const expiresAt = expiresAtRaw.trim() ? expiresAtRaw.trim() : null;
  const noteRaw = typeof payload.note === "string" ? payload.note : "";
  const note = noteRaw.trim() ? noteRaw : null;
  const purchasePriceCents =
    typeof payload.purchasePriceCents === "number"
      ? payload.purchasePriceCents
      : null;
  const purchaseCurrency = payload.purchaseCurrency?.trim() || "CNY";

  db.prepare(
    `INSERT INTO assets (
       id,
       asset_no,
       name,
       category,
       spec_model,
       status,
       company_code,
       owner,
       location,
       purchase_date,
       expires_at,
       note,
       purchase_price_cents,
       purchase_currency,
       created_at,
       updated_at
     )
     VALUES (
       @id,
       @asset_no,
       @name,
       @category,
       @spec_model,
       @status,
       @company_code,
       @owner,
       @location,
       @purchaseDate,
       @expires_at,
       @note,
       @purchase_price_cents,
       @purchase_currency,
       datetime('now'),
       datetime('now')
     )`,
  ).run({
    id,
    asset_no: assetNo,
    name: payload.name,
    category: payload.category,
    spec_model: specModel,
    status: payload.status,
    company_code: payload.companyCode,
    owner: payload.owner,
    location: payload.location,
    purchaseDate: payload.purchaseDate,
    expires_at: expiresAt,
    note,
    purchase_price_cents: purchasePriceCents,
    purchase_currency: purchaseCurrency,
  });

  return {
    id,
    ...payload,
    assetNo,
    specModel: specModel ?? undefined,
    expiresAt: expiresAt ?? undefined,
    note: note ?? undefined,
    purchasePriceCents: purchasePriceCents ?? undefined,
    purchaseCurrency,
  };
}

export function updateAsset(id: string, payload: CreateAssetPayload): Asset | null {
  const db = getDb();

  const existing = getAssetById(id);
  if (!existing) {
    return null;
  }

  const assetNo =
    payload.assetNo === undefined
      ? existing.assetNo ?? null
      : payload.assetNo.trim()
        ? payload.assetNo.trim()
        : null;
  const specModel =
    payload.specModel === undefined
      ? existing.specModel ?? null
      : payload.specModel.trim()
        ? payload.specModel.trim()
        : null;
  const expiresAt =
    payload.expiresAt === undefined
      ? existing.expiresAt ?? null
      : payload.expiresAt.trim()
        ? payload.expiresAt.trim()
        : null;
  const note =
    payload.note === undefined
      ? existing.note ?? null
      : payload.note.trim()
        ? payload.note
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
    `UPDATE assets
     SET asset_no=@asset_no,
         name=@name,
         category=@category,
         spec_model=@spec_model,
         status=@status,
         company_code=@company_code,
         owner=@owner,
         location=@location,
         purchase_date=@purchaseDate,
         expires_at=@expires_at,
         note=@note,
         purchase_price_cents=@purchase_price_cents,
         purchase_currency=@purchase_currency,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    asset_no: assetNo,
    name: payload.name,
    category: payload.category,
    spec_model: specModel,
    status: payload.status,
    company_code: payload.companyCode,
    owner: payload.owner,
    location: payload.location,
    purchaseDate: payload.purchaseDate,
    expires_at: expiresAt,
    note,
    purchase_price_cents: purchasePriceCents,
    purchase_currency: purchaseCurrency,
  });

  return {
    id,
    ...payload,
    assetNo: assetNo ?? undefined,
    specModel: specModel ?? undefined,
    expiresAt: expiresAt ?? undefined,
    note: note ?? undefined,
    purchasePriceCents: purchasePriceCents ?? undefined,
    purchaseCurrency,
  };
}

export function deleteAsset(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM assets WHERE id = ?").run(id);
  return result.changes > 0;
}

export function updateAssetPurchasePrice(
  id: string,
  payload: { purchasePriceCents: number; purchaseCurrency?: string },
): Asset | null {
  const db = getDb();
  const existing = getAssetById(id);
  if (!existing) {
    return null;
  }
  const currency = payload.purchaseCurrency?.trim() || existing.purchaseCurrency || "CNY";

  db.prepare(
    `UPDATE assets
     SET purchase_price_cents=@purchase_price_cents,
         purchase_currency=@purchase_currency,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    purchase_price_cents: payload.purchasePriceCents,
    purchase_currency: currency,
  });

  return getAssetById(id);
}

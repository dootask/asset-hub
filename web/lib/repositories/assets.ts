import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type { Asset, CreateAssetPayload } from "@/lib/types/asset";

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

export function createAsset(payload: CreateAssetPayload): Asset {
  const db = getDb();
  const id = `AST-${randomUUID().slice(0, 8).toUpperCase()}`;
  const assetNo =
    payload.assetNo?.trim()
      ? payload.assetNo.trim()
      : id;
  const specModel = payload.specModel?.trim() ? payload.specModel.trim() : null;
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
    purchase_price_cents: purchasePriceCents,
    purchase_currency: purchaseCurrency,
  });

  return {
    id,
    ...payload,
    assetNo,
    specModel: specModel ?? undefined,
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
    purchase_price_cents: purchasePriceCents,
    purchase_currency: purchaseCurrency,
  });

  return {
    id,
    ...payload,
    assetNo: assetNo ?? undefined,
    specModel: specModel ?? undefined,
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

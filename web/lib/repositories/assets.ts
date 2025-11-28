import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type { Asset, CreateAssetPayload } from "@/lib/types/asset";

type AssetRow = {
  id: string;
  name: string;
  category: string;
  status: Asset["status"];
  company_code: string | null;
  owner: string;
  location: string;
  purchase_date: string;
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
    name: row.name,
    category: row.category,
    status: row.status,
    companyCode: row.company_code ?? undefined,
    owner: row.owner,
    location: row.location,
    purchaseDate: row.purchase_date,
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
      "(name LIKE @search OR owner LIKE @search OR id LIKE @search OR location LIKE @search)",
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

export function createAsset(payload: CreateAssetPayload): Asset {
  const db = getDb();
  const id = `AST-${randomUUID().slice(0, 8).toUpperCase()}`;

  db.prepare(
    `INSERT INTO assets (
       id,
       name,
       category,
       status,
       company_code,
       owner,
       location,
       purchase_date,
       created_at,
       updated_at
     )
     VALUES (
       @id,
       @name,
       @category,
       @status,
       @company_code,
       @owner,
       @location,
       @purchaseDate,
       datetime('now'),
       datetime('now')
     )`,
  ).run({
    id,
    name: payload.name,
    category: payload.category,
    status: payload.status,
    company_code: payload.companyCode,
    owner: payload.owner,
    location: payload.location,
    purchaseDate: payload.purchaseDate,
  });

  return {
    id,
    ...payload,
  };
}

export function updateAsset(id: string, payload: CreateAssetPayload): Asset | null {
  const db = getDb();

  const existing = getAssetById(id);
  if (!existing) {
    return null;
  }

  db.prepare(
    `UPDATE assets
     SET name=@name,
         category=@category,
         status=@status,
         company_code=@company_code,
         owner=@owner,
         location=@location,
         purchase_date=@purchaseDate,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    name: payload.name,
    category: payload.category,
    status: payload.status,
    company_code: payload.companyCode,
    owner: payload.owner,
    location: payload.location,
    purchaseDate: payload.purchaseDate,
  });

  return { id, ...payload };
}

export function deleteAsset(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM assets WHERE id = ?").run(id);
  return result.changes > 0;
}


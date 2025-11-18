import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import { seedAssets } from "@/lib/db/schema";
import type { Asset, CreateAssetPayload } from "@/lib/types/asset";

type AssetRow = {
  id: string;
  name: string;
  category: string;
  status: Asset["status"];
  owner: string;
  location: string;
  purchase_date: string;
};

export interface AssetQuery {
  search?: string;
  status?: Asset["status"][];
  category?: string;
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
    owner: row.owner,
    location: row.location,
    purchaseDate: row.purchase_date,
  };
}

function seedIfEmpty() {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(1) as count FROM assets").get() as {
    count: number;
  };

  if (count.count === 0) {
    const insert = db.prepare(
      `INSERT INTO assets (id, name, category, status, owner, location, purchase_date)
       VALUES (@id, @name, @category, @status, @owner, @location, @purchaseDate)
      `,
    );

    const insertMany = db.transaction((rows: typeof seedAssets) => {
      rows.forEach((row) =>
        insert.run({
          ...row,
          id: row.id ?? randomUUID(),
        }),
      );
    });

    insertMany(seedAssets);
  }
}

export function listAssets(query: AssetQuery = {}): AssetListResult {
  seedIfEmpty();
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
  seedIfEmpty();
  const db = getDb();
  const row = db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as AssetRow | undefined;
  return row ? mapRow(row) : null;
}

export function createAsset(payload: CreateAssetPayload): Asset {
  const db = getDb();
  const id = `AST-${randomUUID().slice(0, 8).toUpperCase()}`;

  db.prepare(
    `INSERT INTO assets (id, name, category, status, owner, location, purchase_date, created_at, updated_at)
     VALUES (@id, @name, @category, @status, @owner, @location, @purchaseDate, datetime('now'), datetime('now'))`,
  ).run({
    id,
    ...payload,
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
         owner=@owner,
         location=@location,
         purchase_date=@purchaseDate,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    ...payload,
  });

  return { id, ...payload };
}

export function deleteAsset(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM assets WHERE id = ?").run(id);
  return result.changes > 0;
}


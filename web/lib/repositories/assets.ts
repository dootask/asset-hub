import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type { Asset, CreateAssetPayload } from "@/lib/types/asset";

const seedAssets: Array<Omit<Asset, "id"> & { id?: string }> = [
  {
    id: "AST-001",
    name: "MacBook Pro 16”",
    category: "Laptop",
    status: "in-use",
    owner: "王小明",
    location: "上海总部",
    purchaseDate: "2024-01-15",
  },
  {
    id: "AST-002",
    name: "Dell PowerEdge R760",
    category: "Server",
    status: "idle",
    owner: "基础架构组",
    location: "上海机房",
    purchaseDate: "2023-11-03",
  },
  {
    id: "AST-003",
    name: "海康威视摄像头",
    category: "Security",
    status: "maintenance",
    owner: "行政部",
    location: "北京办公区",
    purchaseDate: "2022-09-20",
  },
];

type AssetRow = {
  id: string;
  name: string;
  category: string;
  status: Asset["status"];
  owner: string;
  location: string;
  purchase_date: string;
};

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

export function listAssets(): Asset[] {
  seedIfEmpty();
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM assets ORDER BY created_at DESC")
    .all() as AssetRow[];
  return rows.map(mapRow);
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


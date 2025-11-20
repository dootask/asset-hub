import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  AssetCategory,
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
} from "@/lib/types/asset-category";

type AssetCategoryRow = {
  id: string;
  code: string;
  label_zh: string;
  label_en: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: AssetCategoryRow): AssetCategory {
  return {
    id: row.id,
    code: row.code,
    labelZh: row.label_zh,
    labelEn: row.label_en,
    description: row.description,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function resolveCode(input: CreateAssetCategoryInput) {
  if (input.code && input.code.trim()) {
    return input.code.trim();
  }
  const base = input.labelEn?.trim() || input.labelZh?.trim() || "";
  const slug = slugify(base);
  return slug || `cat-${randomUUID().slice(0, 6)}`;
}

export function listAssetCategories(): AssetCategory[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT *
       FROM asset_categories
       ORDER BY label_en COLLATE NOCASE`,
    )
    .all() as AssetCategoryRow[];
  return rows.map(mapRow);
}

export function getAssetCategoryById(id: string): AssetCategory | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM asset_categories WHERE id = ?`)
    .get(id) as AssetCategoryRow | undefined;
  return row ? mapRow(row) : null;
}

export function getAssetCategoryByCode(code: string): AssetCategory | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM asset_categories WHERE code = ?`)
    .get(code) as AssetCategoryRow | undefined;
  return row ? mapRow(row) : null;
}

export function createAssetCategory(
  input: CreateAssetCategoryInput,
): AssetCategory {
  const db = getDb();
  const code = resolveCode(input);
  const existing = getAssetCategoryByCode(code);
  if (existing) {
    throw new Error("CATEGORY_CODE_EXISTS");
  }

  if (!input.labelZh?.trim() || !input.labelEn?.trim()) {
    throw new Error("CATEGORY_LABEL_REQUIRED");
  }

  const id = `CAT-${randomUUID().slice(0, 8).toUpperCase()}`;
  db.prepare(
    `INSERT INTO asset_categories (
      id,
      code,
      label_zh,
      label_en,
      description,
      color,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @code,
      @labelZh,
      @labelEn,
      @description,
      @color,
      datetime('now'),
      datetime('now')
    )`,
  ).run({
    id,
    code,
    labelZh: input.labelZh.trim(),
    labelEn: input.labelEn.trim(),
    description: input.description?.trim() || null,
    color: input.color?.trim() || null,
  });

  return getAssetCategoryById(id)!;
}

export function updateAssetCategory(
  id: string,
  input: UpdateAssetCategoryInput,
): AssetCategory {
  const db = getDb();
  const existing = getAssetCategoryById(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  const next = {
    labelZh: input.labelZh?.trim() || existing.labelZh,
    labelEn: input.labelEn?.trim() || existing.labelEn,
    description:
      input.description === undefined
        ? existing.description
        : input.description?.trim() || null,
    color:
      input.color === undefined
        ? existing.color
        : input.color?.trim() || null,
  };

  db.prepare(
    `UPDATE asset_categories
     SET label_zh=@labelZh,
         label_en=@labelEn,
         description=@description,
         color=@color,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    ...next,
  });

  return getAssetCategoryById(id)!;
}

export function deleteAssetCategory(id: string) {
  const db = getDb();
  const existing = getAssetCategoryById(id);
  if (!existing) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  const usage = db
    .prepare(`SELECT COUNT(1) as count FROM assets WHERE category = ?`)
    .get(existing.code) as { count: number };
  if (usage.count > 0) {
    throw new Error("CATEGORY_IN_USE");
  }

  db.prepare(`DELETE FROM asset_categories WHERE id = ?`).run(id);
}



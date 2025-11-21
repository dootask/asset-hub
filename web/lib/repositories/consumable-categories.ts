import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  ConsumableCategory,
  CreateConsumableCategoryPayload,
} from "@/lib/types/consumable";

type CategoryRow = {
  id: string;
  code: string;
  label_zh: string;
  label_en: string;
  description: string | null;
  unit: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CategoryRow): ConsumableCategory {
  return {
    id: row.id,
    code: row.code,
    labelZh: row.label_zh,
    labelEn: row.label_en,
    description: row.description,
    unit: row.unit,
  };
}

export function listConsumableCategories(): ConsumableCategory[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM consumable_categories ORDER BY created_at DESC`)
    .all() as CategoryRow[];
  return rows.map(mapRow);
}

export function createConsumableCategory(
  payload: CreateConsumableCategoryPayload,
): ConsumableCategory {
  const db = getDb();
  const id = `CC-${randomUUID().slice(0, 6).toUpperCase()}`;
  db.prepare(
    `INSERT INTO consumable_categories (
        id,
        code,
        label_zh,
        label_en,
        description,
        unit,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @code,
        @label_zh,
        @label_en,
        @description,
        @unit,
        datetime('now'),
        datetime('now')
      )`,
  ).run({
    id,
    code: payload.code,
    label_zh: payload.labelZh,
    label_en: payload.labelEn,
    description: payload.description ?? null,
    unit: payload.unit ?? null,
  });
  return mapRow({
    id,
    code: payload.code,
    label_zh: payload.labelZh,
    label_en: payload.labelEn,
    description: payload.description ?? null,
    unit: payload.unit ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export function deleteConsumableCategory(id: string): boolean {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM consumable_categories WHERE id = ?`)
    .run(id);
  return result.changes > 0;
}

export function updateConsumableCategory(
  id: string,
  payload: Omit<CreateConsumableCategoryPayload, "code">,
): ConsumableCategory | null {
  const db = getDb();
  const existing = db
    .prepare(`SELECT * FROM consumable_categories WHERE id = ? LIMIT 1`)
    .get(id) as CategoryRow | undefined;
  if (!existing) return null;
  db.prepare(
    `UPDATE consumable_categories
     SET label_zh=@label_zh,
         label_en=@label_en,
         description=@description,
         unit=@unit,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    label_zh: payload.labelZh,
    label_en: payload.labelEn,
    description: payload.description ?? null,
    unit: payload.unit ?? null,
  });
  return mapRow({
    ...existing,
    label_zh: payload.labelZh,
    label_en: payload.labelEn,
    description: payload.description ?? null,
    unit: payload.unit ?? null,
    updated_at: new Date().toISOString(),
  });
}


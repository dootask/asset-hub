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
  consumable_no_prefix: string | null;
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
    consumableNoPrefix: row.consumable_no_prefix,
    description: row.description,
    unit: row.unit,
  };
}

function normalizeConsumableNoPrefix(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  if (!/^[A-Z0-9]{1,10}$/.test(normalized)) {
    throw new Error("CONSUMABLE_CATEGORY_NO_PREFIX_INVALID");
  }
  return normalized;
}

export function listConsumableCategories(): ConsumableCategory[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM consumable_categories ORDER BY created_at DESC`)
    .all() as CategoryRow[];
  return rows.map(mapRow);
}

export function getConsumableCategoryByCode(code: string): ConsumableCategory | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM consumable_categories WHERE code = ? LIMIT 1`)
    .get(code) as CategoryRow | undefined;
  return row ? mapRow(row) : null;
}

export function createConsumableCategory(
  payload: CreateConsumableCategoryPayload,
): ConsumableCategory {
  const db = getDb();
  const id = `CC-${randomUUID().slice(0, 6).toUpperCase()}`;
  const consumableNoPrefix = normalizeConsumableNoPrefix(payload.consumableNoPrefix);
  db.prepare(
    `INSERT INTO consumable_categories (
        id,
        code,
        label_zh,
        label_en,
        consumable_no_prefix,
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
        @consumable_no_prefix,
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
    consumable_no_prefix: consumableNoPrefix,
    description: payload.description ?? null,
    unit: payload.unit ?? null,
  });
  return mapRow({
    id,
    code: payload.code,
    label_zh: payload.labelZh,
    label_en: payload.labelEn,
    consumable_no_prefix: consumableNoPrefix,
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
  const consumableNoPrefix =
    payload.consumableNoPrefix === undefined
      ? existing.consumable_no_prefix
      : normalizeConsumableNoPrefix(payload.consumableNoPrefix);
  db.prepare(
    `UPDATE consumable_categories
     SET label_zh=@label_zh,
         label_en=@label_en,
         consumable_no_prefix=@consumable_no_prefix,
         description=@description,
         unit=@unit,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    label_zh: payload.labelZh,
    label_en: payload.labelEn,
    consumable_no_prefix: consumableNoPrefix,
    description: payload.description ?? null,
    unit: payload.unit ?? null,
  });
  return mapRow({
    ...existing,
    label_zh: payload.labelZh,
    label_en: payload.labelEn,
    consumable_no_prefix: consumableNoPrefix,
    description: payload.description ?? null,
    unit: payload.unit ?? null,
    updated_at: new Date().toISOString(),
  });
}

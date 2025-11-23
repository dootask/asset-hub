import { getDb } from "@/lib/db/client";
import { seedOperationTemplates } from "@/lib/db/schema";
import type {
  OperationTemplate,
  OperationTemplateId,
  OperationTemplateInput,
} from "@/lib/types/operation-template";

type OperationTemplateRow = {
  id: string;
  type: OperationTemplateId;
  label_zh: string;
  label_en: string;
  description_zh: string | null;
  description_en: string | null;
  require_attachment: number;
  metadata: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: OperationTemplateRow): OperationTemplate {
  return {
    id: row.id,
    type: row.type,
    labelZh: row.label_zh,
    labelEn: row.label_en,
    descriptionZh: row.description_zh,
    descriptionEn: row.description_en,
    requireAttachment: Boolean(row.require_attachment),
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Preserve the seed-defined ordering for deterministic UI display.
const TEMPLATE_ORDER = new Map<OperationTemplateId, number>(
  seedOperationTemplates.map((tpl, index) => [tpl.type as OperationTemplateId, index]),
);

function ensureSeeded(db: ReturnType<typeof getDb>) {
  const { count } = db
    .prepare(`SELECT COUNT(1) as count FROM asset_operation_templates`)
    .get() as { count: number };
  if (count > 0) {
    return;
  }

  const insert = db.prepare(
    `INSERT INTO asset_operation_templates (
      id,
      type,
      label_zh,
      label_en,
      description_zh,
      description_en,
      require_attachment,
      metadata
    ) VALUES (
      @id,
      @type,
      @label_zh,
      @label_en,
      @description_zh,
      @description_en,
      @require_attachment,
      @metadata
    )`,
  );

  const insertMany = db.transaction((rows: typeof seedOperationTemplates) => {
    rows.forEach((row) => {
      insert.run({
        id: row.id,
        type: row.type,
        label_zh: row.label_zh,
        label_en: row.label_en,
        description_zh: row.description_zh ?? null,
        description_en: row.description_en ?? null,
        require_attachment: row.require_attachment ?? 0,
        metadata: row.metadata ?? null,
      });
    });
  });

  insertMany(seedOperationTemplates);
}

export function listOperationTemplates(): OperationTemplate[] {
  const db = getDb();
  ensureSeeded(db);
  const rows = db
    .prepare(`SELECT * FROM asset_operation_templates`)
    .all() as OperationTemplateRow[];

  const sortedRows = [...rows].sort((a, b) => {
    const orderA = TEMPLATE_ORDER.get(a.type) ?? Number.MAX_SAFE_INTEGER;
    const orderB = TEMPLATE_ORDER.get(b.type) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.type.localeCompare(b.type);
  });

  return sortedRows.map(mapRow);
}

export function getOperationTemplateByType(
  type: OperationTemplateId,
): OperationTemplate | null {
  const db = getDb();
  ensureSeeded(db);
  const row = db
    .prepare(`SELECT * FROM asset_operation_templates WHERE type = ?`)
    .get(type) as OperationTemplateRow | undefined;
  return row ? mapRow(row) : null;
}

export function updateOperationTemplate(
  type: OperationTemplateId,
  input: OperationTemplateInput,
): OperationTemplate {
  const db = getDb();
  ensureSeeded(db);
  const existing = getOperationTemplateByType(type);
  if (!existing) {
    throw new Error("TEMPLATE_NOT_FOUND");
  }

  const next = {
    descriptionZh:
      input.descriptionZh === undefined
        ? existing.descriptionZh
        : input.descriptionZh?.trim() || null,
    descriptionEn:
      input.descriptionEn === undefined
        ? existing.descriptionEn
        : input.descriptionEn?.trim() || null,
    requireAttachment:
      input.requireAttachment === undefined
        ? existing.requireAttachment
        : Boolean(input.requireAttachment),
    metadata:
      input.metadata === undefined ? existing.metadata : input.metadata ?? null,
  };

  db.prepare(
    `UPDATE asset_operation_templates
     SET description_zh=@descriptionZh,
         description_en=@descriptionEn,
         require_attachment=@requireAttachment,
         metadata=@metadata,
         updated_at=datetime('now')
     WHERE type=@type`,
  ).run({
    type,
    descriptionZh: next.descriptionZh,
    descriptionEn: next.descriptionEn,
    requireAttachment: next.requireAttachment ? 1 : 0,
    metadata: next.metadata ? JSON.stringify(next.metadata) : null,
  });

  return getOperationTemplateByType(type)!;
}


import { getDb } from "@/lib/db/client";
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

export function listOperationTemplates(): OperationTemplate[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM asset_operation_templates
       ORDER BY type`,
    )
    .all() as OperationTemplateRow[];
  return rows.map(mapRow);
}

export function getOperationTemplateByType(
  type: OperationTemplateId,
): OperationTemplate | null {
  const db = getDb();
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




import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  CreateReportViewPayload,
  ReportView,
} from "@/lib/types/report";

type ReportViewRow = {
  id: string;
  name: string;
  data_source: string;
  fields: string;
  filters: string | null;
  created_at: string;
};

function mapRow(row: ReportViewRow): ReportView {
  return {
    id: row.id,
    name: row.name,
    dataSource: row.data_source as ReportView["dataSource"],
    fields: JSON.parse(row.fields) as string[],
    filters: row.filters ? (JSON.parse(row.filters) as Record<string, unknown>) : undefined,
    createdAt: row.created_at,
  };
}

export function listReportViews(): ReportView[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM report_views ORDER BY created_at DESC`)
    .all() as ReportViewRow[];
  return rows.map(mapRow);
}

export function getReportViewById(id: string): ReportView | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM report_views WHERE id = ? LIMIT 1`)
    .get(id) as ReportViewRow | undefined;
  return row ? mapRow(row) : null;
}

export function createReportView(payload: CreateReportViewPayload): ReportView {
  const db = getDb();
  const id = `RV-${randomUUID().slice(0, 6).toUpperCase()}`;
  db.prepare(
    `INSERT INTO report_views (id, name, data_source, fields, filters, created_at, updated_at)
     VALUES (@id, @name, @dataSource, @fields, @filters, datetime('now'), datetime('now'))`,
  ).run({
    id,
    name: payload.name,
    dataSource: payload.dataSource,
    fields: JSON.stringify(payload.fields),
    filters: payload.filters ? JSON.stringify(payload.filters) : null,
  });
  return getReportViewById(id)!;
}

export function updateReportView(
  id: string,
  payload: CreateReportViewPayload,
): ReportView | null {
  const db = getDb();
  const existing = getReportViewById(id);
  if (!existing) return null;
  db.prepare(
    `UPDATE report_views
     SET name=@name,
         data_source=@dataSource,
         fields=@fields,
         filters=@filters,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    name: payload.name,
    dataSource: payload.dataSource,
    fields: JSON.stringify(payload.fields),
    filters: payload.filters ? JSON.stringify(payload.filters) : null,
  });
  return getReportViewById(id);
}

export function deleteReportView(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM report_views WHERE id = ?`).run(id);
  return result.changes > 0;
}


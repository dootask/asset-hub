import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  Company,
  CreateCompanyPayload,
} from "@/lib/types/system";

type CompanyRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
};

function mapRow(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description ?? undefined,
    createdAt: row.created_at,
  };
}

export function listCompanies(): Company[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM companies ORDER BY created_at DESC`)
    .all() as CompanyRow[];

  return rows.map(mapRow);
}

export function getCompanyById(id: string): Company | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM companies WHERE id = ?`).get(id) as
    | CompanyRow
    | undefined;
  return row ? mapRow(row) : null;
}

export function createCompany(payload: CreateCompanyPayload): Company {
  const db = getDb();
  const id = `COMP-${randomUUID().slice(0, 6).toUpperCase()}`;

  db.prepare(
    `INSERT INTO companies (id, name, code, description, created_at, updated_at)
     VALUES (@id, @name, @code, @description, datetime('now'), datetime('now'))`,
  ).run({
    id,
    ...payload,
  });

  return {
    id,
    ...payload,
    createdAt: new Date().toISOString(),
  };
}

export function updateCompany(
  id: string,
  payload: CreateCompanyPayload,
): Company | null {
  const db = getDb();
  const existing = getCompanyById(id);
  if (!existing) return null;

  db.prepare(
    `UPDATE companies
     SET name=@name,
         code=@code,
         description=@description,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({ id, ...payload });

  return { ...existing, ...payload };
}

export function deleteCompany(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM companies WHERE id = ?`).run(id);
  return result.changes > 0;
}


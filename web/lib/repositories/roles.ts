import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type { CreateRolePayload, Role } from "@/lib/types/system";

type RoleRow = {
  id: string;
  name: string;
  scope: string;
  description: string | null;
  created_at: string;
};

function mapRow(row: RoleRow): Role {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    description: row.description ?? undefined,
    createdAt: row.created_at,
  };
}

export function listRoles(): Role[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM roles ORDER BY created_at DESC`)
    .all() as RoleRow[];
  return rows.map(mapRow);
}

export function getRoleById(id: string): Role | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM roles WHERE id = ?`).get(id) as
    | RoleRow
    | undefined;
  return row ? mapRow(row) : null;
}

export function createRole(payload: CreateRolePayload): Role {
  const db = getDb();
  const id = `ROLE-${randomUUID().slice(0, 6).toUpperCase()}`;

  db.prepare(
    `INSERT INTO roles (id, name, scope, description, created_at, updated_at)
     VALUES (@id, @name, @scope, @description, datetime('now'), datetime('now'))`,
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

export function updateRole(id: string, payload: CreateRolePayload): Role | null {
  const db = getDb();
  const existing = getRoleById(id);
  if (!existing) return null;

  db.prepare(
    `UPDATE roles
     SET name=@name,
         scope=@scope,
         description=@description,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({ id, ...payload });

  return { ...existing, ...payload };
}

export function deleteRole(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM roles WHERE id = ?`).run(id);
  return result.changes > 0;
}


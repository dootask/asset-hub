import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type { CreateRolePayload, Role } from "@/lib/types/system";

type RoleRow = {
  id: string;
  name: string;
  scope: string;
  description: string | null;
  created_at: string;
  member_user_ids: string | null;
};

function mapRow(row: RoleRow): Role {
  let members: string[] = [];
  if (row.member_user_ids) {
    try {
      const parsed = JSON.parse(row.member_user_ids);
      if (Array.isArray(parsed)) {
        members = parsed
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter(Boolean);
      }
    } catch {
      members = [];
    }
  }
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    members,
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
  const members =
    payload.members?.map((entry) => entry.trim()).filter(Boolean) ?? [];

  db.prepare(
    `INSERT INTO roles (
       id,
       name,
       scope,
       description,
       member_user_ids,
       created_at,
       updated_at
     )
     VALUES (
       @id,
       @name,
       @scope,
       @description,
       @member_user_ids,
       datetime('now'),
       datetime('now')
     )`,
  ).run({
    id,
    name: payload.name,
    scope: payload.scope,
    description: payload.description ?? null,
    member_user_ids: members.length > 0 ? JSON.stringify(members) : null,
  });

  return {
    id,
    name: payload.name,
    scope: payload.scope,
    description: payload.description,
    members,
    createdAt: new Date().toISOString(),
  };
}

export function updateRole(id: string, payload: CreateRolePayload): Role | null {
  const db = getDb();
  const existing = getRoleById(id);
  if (!existing) return null;
  const members =
    payload.members?.map((entry) => entry.trim()).filter(Boolean) ?? [];

  db.prepare(
    `UPDATE roles
     SET name=@name,
         scope=@scope,
         description=@description,
         member_user_ids=@member_user_ids,
         updated_at=datetime('now')
     WHERE id=@id`,
  ).run({
    id,
    name: payload.name,
    scope: payload.scope,
    description: payload.description ?? null,
    member_user_ids: members.length > 0 ? JSON.stringify(members) : null,
  });

  return {
    ...existing,
    name: payload.name,
    scope: payload.scope,
    description: payload.description,
    members,
  };
}

export function deleteRole(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM roles WHERE id = ?`).run(id);
  return result.changes > 0;
}


import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  AssetOperation,
  AssetOperationStatus,
  AssetOperationType,
  CreateAssetOperationPayload,
} from "@/lib/types/operation";

type OperationRow = {
  id: string;
  asset_id: string;
  type: AssetOperationType;
  description: string;
  actor: string;
  status: AssetOperationStatus;
  metadata: string | null;
  created_at: string;
  updated_at: string;
};

function parseMetadata(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapRow(row: OperationRow): AssetOperation {
  return {
    id: row.id,
    assetId: row.asset_id,
    type: row.type,
    description: row.description ?? "",
    actor: row.actor,
    status: row.status,
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

export function listOperationsForAsset(assetId: string): AssetOperation[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM asset_operations WHERE asset_id = ? ORDER BY created_at DESC`,
    )
    .all(assetId) as OperationRow[];

  return rows.map(mapRow);
}

export function getAssetOperationById(
  operationId: string,
): AssetOperation | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM asset_operations WHERE id = ?`)
    .get(operationId) as OperationRow | undefined;

  return row ? mapRow(row) : null;
}

export function updateAssetOperationStatus(
  operationId: string,
  status: AssetOperationStatus,
) {
  const db = getDb();
  db.prepare(
    `UPDATE asset_operations
     SET status = @status, updated_at = datetime('now')
     WHERE id = @operationId`,
  ).run({ status, operationId });
}

export function createAssetOperation(
  assetId: string,
  payload: CreateAssetOperationPayload,
): AssetOperation {
  const db = getDb();
  const id = `OP-${randomUUID().slice(0, 8).toUpperCase()}`;
  const status = payload.status ?? "done";

  db.prepare(
    `INSERT INTO asset_operations (
        id,
        asset_id,
        type,
        description,
        actor,
        status,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @assetId,
        @type,
        @description,
        @actor,
        @status,
        @metadata,
        datetime('now'),
        datetime('now')
      )`,
  ).run({
    id,
    assetId,
    type: payload.type,
    description: payload.description ?? "",
    actor: payload.actor,
    status,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
  });

  return {
    id,
    assetId,
    type: payload.type,
    description: payload.description ?? "",
    actor: payload.actor,
    status,
    metadata: payload.metadata ?? null,
    createdAt: new Date().toISOString(),
  };
}


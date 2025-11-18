import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  AssetOperation,
  AssetOperationType,
  CreateAssetOperationPayload,
} from "@/lib/types/operation";

type OperationRow = {
  id: string;
  asset_id: string;
  type: AssetOperationType;
  description: string;
  actor: string;
  created_at: string;
};

function mapRow(row: OperationRow): AssetOperation {
  return {
    id: row.id,
    assetId: row.asset_id,
    type: row.type,
    description: row.description ?? "",
    actor: row.actor,
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

export function createAssetOperation(
  assetId: string,
  payload: CreateAssetOperationPayload,
): AssetOperation {
  const db = getDb();
  const id = `OP-${randomUUID().slice(0, 8).toUpperCase()}`;

  db.prepare(
    `INSERT INTO asset_operations (id, asset_id, type, description, actor, created_at)
     VALUES (@id, @assetId, @type, @description, @actor, datetime('now'))`,
  ).run({
    id,
    assetId,
    ...payload,
  });

  return {
    id,
    assetId,
    ...payload,
    createdAt: new Date().toISOString(),
  };
}


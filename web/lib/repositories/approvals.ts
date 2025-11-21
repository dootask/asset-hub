import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import {
  type ApprovalAction,
  type ApprovalActionPayload,
  type ApprovalListFilters,
  type ApprovalRequest,
  type ApprovalStatus,
  type ApprovalType,
  type CreateApprovalRequestPayload,
} from "@/lib/types/approval";
import {
  createAssetOperation,
  getAssetOperationById,
  listOperationsForAsset,
  updateAssetOperationStatus,
} from "@/lib/repositories/asset-operations";
import { getAssetById, updateAsset } from "@/lib/repositories/assets";
import type { AssetStatus } from "@/lib/types/asset";
import type { AssetOperationType } from "@/lib/types/operation";
import type {
  OperationTemplateMetadata,
  OperationTemplateValues,
} from "@/lib/types/operation-template";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";

type ApprovalRow = {
  id: string;
  asset_id: string | null;
  operation_id: string | null;
  type: ApprovalType;
  status: ApprovalStatus;
  title: string;
  reason: string | null;
  applicant_id: string;
  applicant_name: string | null;
  approver_id: string | null;
  approver_name: string | null;
  result: string | null;
  external_todo_id: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function parseMetadata(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapRow(row: ApprovalRow): ApprovalRequest {
  return {
    id: row.id,
    assetId: row.asset_id,
    operationId: row.operation_id,
    type: row.type,
    status: row.status,
    title: row.title,
    reason: row.reason,
    applicantId: row.applicant_id,
    applicantName: row.applicant_name,
    approverId: row.approver_id,
    approverName: row.approver_name,
    result: row.result,
    externalTodoId: row.external_todo_id,
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function buildFilters(filters: ApprovalListFilters | undefined) {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters?.status?.length) {
    conditions.push(
      `status IN (${filters.status.map((_, index) => `@status${index}`).join(", ")})`,
    );
    filters.status.forEach((status, index) => {
      params[`status${index}`] = status;
    });
  }

  if (filters?.type?.length) {
    conditions.push(
      `type IN (${filters.type.map((_, index) => `@type${index}`).join(", ")})`,
    );
    filters.type.forEach((type, index) => {
      params[`type${index}`] = type;
    });
  }

  if (filters?.role === "my-requests" && filters.userId) {
    conditions.push(`applicant_id = @userId`);
    params.userId = filters.userId;
  } else if (filters?.role === "my-tasks" && filters.userId) {
    conditions.push(`approver_id = @userId`);
    params.userId = filters.userId;
  } else {
    if (filters?.applicantId) {
      conditions.push(`applicant_id = @applicantId`);
      params.applicantId = filters.applicantId;
    }
    if (filters?.approverId) {
      conditions.push(`approver_id = @approverId`);
      params.approverId = filters.approverId;
    }
  }

  if (filters?.assetId) {
    conditions.push(`asset_id = @assetId`);
    params.assetId = filters.assetId;
  }

  if (filters?.operationId) {
    conditions.push(`operation_id = @operationId`);
    params.operationId = filters.operationId;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const page = filters?.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters?.pageSize && filters.pageSize > 0 ? filters.pageSize : 10;

  return { where, params, page, pageSize };
}

export function listApprovalRequests(filters?: ApprovalListFilters) {
  const db = getDb();
  const { where, params, page, pageSize } = buildFilters(filters);

  const { count } = db
    .prepare(`SELECT COUNT(1) as count FROM asset_approval_requests ${where}`)
    .get(params) as { count: number };

  const rows = db
    .prepare(
      `SELECT * FROM asset_approval_requests
       ${where}
       ORDER BY created_at DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({
      ...params,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }) as ApprovalRow[];

  return {
    data: rows.map(mapRow),
    meta: {
      total: count,
      page,
      pageSize,
    },
  };
}

export function getApprovalRequestById(id: string): ApprovalRequest | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM asset_approval_requests WHERE id = ?`)
    .get(id) as ApprovalRow | undefined;

  return row ? mapRow(row) : null;
}

export function createApprovalRequest(
  payload: CreateApprovalRequestPayload,
): ApprovalRequest {
  const db = getDb();
  const id = `APR-${randomUUID().slice(0, 8).toUpperCase()}`;

  db.prepare(
    `INSERT INTO asset_approval_requests (
      id,
      asset_id,
      operation_id,
      type,
      status,
      title,
      reason,
      applicant_id,
      applicant_name,
      approver_id,
      approver_name,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @assetId,
      @operationId,
      @type,
      'pending',
      @title,
      @reason,
      @applicantId,
      @applicantName,
      @approverId,
      @approverName,
      @metadata,
      datetime('now'),
      datetime('now')
    )`,
  ).run({
    id,
    assetId: payload.assetId ?? null,
    operationId: payload.operationId ?? null,
    type: payload.type,
    title: payload.title,
    reason: payload.reason ?? null,
    applicantId: payload.applicant.id,
    applicantName: payload.applicant.name ?? null,
    approverId: payload.approver?.id ?? null,
    approverName: payload.approver?.name ?? null,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
  });

  if (payload.operationId) {
    updateAssetOperationStatus(payload.operationId, "pending");
  }

  return getApprovalRequestById(id)!;
}

const ACTION_STATUS_MAP: Record<ApprovalAction, ApprovalStatus> = {
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled",
};

function inferAssetStatusFromType(
  type?: AssetOperationType | ApprovalType | string | null,
): AssetStatus | null {
  switch (type) {
    case "receive":
    case "borrow":
      return "in-use";
    case "return":
      return "idle";
    case "inbound":
      return "idle";
    case "maintenance":
      return "maintenance";
    case "dispose":
      return "retired";
    default:
      return null;
  }
}

function extractOwnerFromTemplateValues(
  values?: OperationTemplateValues | null,
) {
  if (!values) return null;
  const candidateKeys = ["receiver", "borrower"];
  for (const key of candidateKeys) {
    const value = values[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function extractOwnerFromMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata) return null;
  const templateMetadata = extractOperationTemplateMetadata(metadata);
  const ownerFromTemplate = extractOwnerFromTemplateValues(
    templateMetadata?.values,
  );
  if (ownerFromTemplate) {
    return ownerFromTemplate;
  }
  const candidateKeys = ["receiver", "borrower"];
  for (const key of candidateKeys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function ensurePendingInboundOperation(
  approval: ApprovalRequest,
  metadata: OperationTemplateMetadata | null,
  actor: ApprovalActionPayload["actor"],
) {
  if (!approval.assetId) {
    return;
  }
  const existing = listOperationsForAsset(approval.assetId).find((operation) => {
    const record = operation.metadata as Record<string, unknown> | null;
    if (!record) return false;
    const marker = (record as { autoGeneratedFromApprovalId?: unknown })
      .autoGeneratedFromApprovalId;
    return typeof marker === "string" && marker === approval.id;
  });
  if (existing) {
    return;
  }

  const metadataPayload: Record<string, unknown> = {
    autoGeneratedFromApprovalId: approval.id,
    autoGeneratedFromApprovalType: approval.type,
    sourceApprovalTitle: approval.title,
  };

  if (metadata) {
    metadataPayload.operationTemplate = metadata;
  }

  createAssetOperation(approval.assetId, {
    type: "inbound",
    actor: actor.name ?? actor.id ?? "system",
    status: "pending",
    description: `待入库 · ${approval.title}`,
    metadata: metadataPayload,
  });
}

function applyApprovalSuccessEffects(
  approval: ApprovalRequest,
  actor: ApprovalActionPayload["actor"],
) {
  if (!approval.assetId) {
    return;
  }

  const asset = getAssetById(approval.assetId);
  if (!asset) {
    return;
  }

  const operation = approval.operationId
    ? getAssetOperationById(approval.operationId)
    : null;
  const templateMetadata =
    extractOperationTemplateMetadata(operation?.metadata ?? undefined) ??
    extractOperationTemplateMetadata(approval.metadata ?? undefined);
  const targetStatus = inferAssetStatusFromType(
    operation?.type ?? approval.type,
  );

  if (targetStatus) {
    const ownerFromMetadata =
      extractOwnerFromMetadata(operation?.metadata) ??
      extractOwnerFromMetadata(approval.metadata ?? undefined);

    const { id: assetId, ...assetPayload } = asset;
    const nextPayload = {
      ...assetPayload,
      status: targetStatus,
      owner: ownerFromMetadata ?? asset.owner,
    };

    updateAsset(assetId, nextPayload);
  }

  if (approval.type === "purchase") {
    ensurePendingInboundOperation(approval, templateMetadata, actor);
  }
}

export function applyApprovalAction(
  id: string,
  payload: ApprovalActionPayload,
): ApprovalRequest {
  const existing = getApprovalRequestById(id);

  if (!existing) {
    throw new Error("审批请求不存在");
  }

  if (existing.status !== "pending") {
    throw new Error("该审批已处理，无法再次操作");
  }

  const status = ACTION_STATUS_MAP[payload.action];
  const now = new Date().toISOString();
  const completedAt =
    status === "approved" || status === "rejected" || status === "cancelled"
      ? now
      : null;

  const resultText =
    payload.comment ??
    (status === "approved"
      ? "审批通过"
      : status === "rejected"
        ? "审批驳回"
        : "审批已撤销");

  const db = getDb();
  db.prepare(
    `UPDATE asset_approval_requests
     SET status = @status,
         result = @result,
         approver_id = COALESCE(@approverId, approver_id),
         approver_name = COALESCE(@approverName, approver_name),
         updated_at = @updatedAt,
         completed_at = COALESCE(@completedAt, completed_at)
     WHERE id = @id`,
  ).run({
    id,
    status,
    result: resultText,
    approverId: payload.actor.id,
    approverName: payload.actor.name ?? null,
    updatedAt: now,
    completedAt,
  });

  if (existing.operationId) {
    updateAssetOperationStatus(
      existing.operationId,
      status === "approved" ? "done" : "cancelled",
    );
  }

  const updated = getApprovalRequestById(id)!;
  if (updated.status === "approved") {
    applyApprovalSuccessEffects(updated, payload.actor);
  }

  return updated;
}



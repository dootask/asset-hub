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
import {
  getConsumableOperationById,
  updateConsumableOperationStatus,
} from "@/lib/repositories/consumable-operations";
import type { AssetStatus } from "@/lib/types/asset";
import type { AssetOperationType } from "@/lib/types/operation";
import type { OperationTemplateMetadata } from "@/lib/types/operation-template";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import { updateExternalApprovalTodo } from "@/lib/integrations/dootask-todos";
import {
  extractOwnerFromOperationMetadata,
  inferAssetStatusFromAction,
  resolveTemplateMetadataFromSources,
} from "@/lib/utils/asset-state";

type ApprovalRow = {
  id: string;
  asset_id: string | null;
  consumable_id: string | null;
  operation_id: string | null;
  consumable_operation_id: string | null;
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
    consumableId: row.consumable_id,
    operationId: row.operation_id,
    consumableOperationId: row.consumable_operation_id,
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

function updateApprovalExternalTodoId(
  id: string,
  externalTodoId: string | null,
) {
  const db = getDb();
  db.prepare(
    `UPDATE asset_approval_requests
     SET external_todo_id = @externalTodoId,
         updated_at = datetime('now')
     WHERE id = @id`,
  ).run({
    id,
    externalTodoId,
  });
}

export function setApprovalExternalTodo(
  id: string,
  externalTodoId: string | null,
) {
  updateApprovalExternalTodoId(id, externalTodoId);
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

  if (filters?.consumableId) {
    conditions.push(`consumable_id = @consumableId`);
    params.consumableId = filters.consumableId;
  }

  if (filters?.operationId) {
    conditions.push(`operation_id = @operationId`);
    params.operationId = filters.operationId;
  }

  if (filters?.consumableOperationId) {
    conditions.push(`consumable_operation_id = @consumableOperationId`);
    params.consumableOperationId = filters.consumableOperationId;
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
      consumable_id,
      operation_id,
      consumable_operation_id,
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
      @consumableId,
      @operationId,
      @consumableOperationId,
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
    consumableId: payload.consumableId ?? null,
    operationId: payload.operationId ?? null,
    consumableOperationId: payload.consumableOperationId ?? null,
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

  if (payload.consumableOperationId) {
    updateConsumableOperationStatus(payload.consumableOperationId, "pending");
  }

  return getApprovalRequestById(id)!;
}

const ACTION_STATUS_MAP: Record<ApprovalAction, ApprovalStatus> = {
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled",
};

const AUTO_OPERATION_APPROVAL_TYPES: ApprovalType[] = [
  "receive",
  "borrow",
  "return",
  "dispose",
  "inbound",
];

function mapApprovalTypeToOperationType(
  type: ApprovalType,
): AssetOperationType | null {
  switch (type) {
    case "purchase":
      return "purchase";
    case "inbound":
      return "inbound";
    case "receive":
      return "receive";
    case "borrow":
      return "borrow";
    case "return":
      return "return";
    case "dispose":
      return "dispose";
    default:
      return null;
  }
}

function linkApprovalToAssetOperation(approvalId: string, operationId: string) {
  const db = getDb();
  db.prepare(
    `UPDATE asset_approval_requests
     SET operation_id = @operationId,
         updated_at = datetime('now')
     WHERE id = @approvalId`,
  ).run({ approvalId, operationId });
}

function linkApprovalToConsumableOperation(
  approvalId: string,
  operationId: string,
) {
  const db = getDb();
  db.prepare(
    `UPDATE asset_approval_requests
     SET consumable_operation_id = @operationId,
         updated_at = datetime('now')
     WHERE id = @approvalId`,
  ).run({ approvalId, operationId });
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

function ensureOperationRecordForApproval(
  approval: ApprovalRequest,
  actor: ApprovalActionPayload["actor"],
): ApprovalRequest {
  if (!approval.assetId || approval.operationId) {
    return approval;
  }
  if (!AUTO_OPERATION_APPROVAL_TYPES.includes(approval.type)) {
    return approval;
  }
  const operationType = mapApprovalTypeToOperationType(approval.type);
  if (!operationType) {
    return approval;
  }

  const templateMetadata = extractOperationTemplateMetadata(
    approval.metadata ?? undefined,
  );
  const metadataPayload: Record<string, unknown> = {
    autoGeneratedFromApprovalId: approval.id,
    autoGeneratedFromApprovalType: approval.type,
    sourceApprovalTitle: approval.title,
  };

  const initiatedFrom = (approval.metadata as { initiatedFrom?: unknown })
    ?.initiatedFrom;
  if (typeof initiatedFrom === "string" && initiatedFrom) {
    metadataPayload.initiatedFrom = initiatedFrom;
  }

  if (approval.reason) {
    metadataPayload.reason = approval.reason;
  }

  metadataPayload.applicant = {
    id: approval.applicantId,
    name: approval.applicantName ?? null,
  };

  if (templateMetadata) {
    metadataPayload.operationTemplate = templateMetadata;
  }

  const actorLabel =
    approval.applicantName ??
    approval.applicantId ??
    actor.name ??
    actor.id ??
    "system";

  const operation = createAssetOperation(approval.assetId, {
    type: operationType,
    actor: actorLabel,
    description: approval.title,
    status: "done",
    metadata: metadataPayload,
  });

  linkApprovalToAssetOperation(approval.id, operation.id);
  return getApprovalRequestById(approval.id)!;
}

function applyApprovalSuccessEffects(
  approval: ApprovalRequest,
  actor: ApprovalActionPayload["actor"],
) {
  if (approval.assetId) {
    const asset = getAssetById(approval.assetId);
    if (!asset) {
      return;
    }

    const operation = approval.operationId
      ? getAssetOperationById(approval.operationId)
      : null;
    const templateMetadata = resolveTemplateMetadataFromSources(
      operation?.metadata ?? undefined,
      approval.metadata ?? undefined,
    );
    const targetStatus = inferAssetStatusFromAction(
      operation?.type ?? approval.type,
    );

    if (targetStatus) {
      const ownerFromMetadata =
        extractOwnerFromOperationMetadata(operation?.metadata ?? undefined) ??
        extractOwnerFromOperationMetadata(approval.metadata ?? undefined);

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
    return;
  }

  if (approval.consumableId && approval.consumableOperationId) {
    const operation = getConsumableOperationById(
      approval.consumableOperationId,
    );
    if (!operation || operation.status === "done") {
      return;
    }
    updateConsumableOperationStatus(operation.id, "done");
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

  if (existing.consumableOperationId) {
    updateConsumableOperationStatus(
      existing.consumableOperationId,
      status === "approved" ? "done" : "cancelled",
    );
  }

  let updated = getApprovalRequestById(id)!;
  if (updated.status === "approved") {
    updated = ensureOperationRecordForApproval(updated, payload.actor);
    applyApprovalSuccessEffects(updated, payload.actor);
  }
  void updateExternalApprovalTodo(updated, updated.externalTodoId);

  return updated;
}



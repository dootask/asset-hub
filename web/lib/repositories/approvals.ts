import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import {
  type ApprovalAction,
  type ApprovalActionPayload,
  type ApprovalCcRecipient,
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
import {
  getAssetById,
  updateAsset,
  createAsset,
  updateAssetPurchasePrice,
} from "@/lib/repositories/assets";
import {
  getConsumableOperationById,
  updateConsumableOperationStatus,
} from "@/lib/repositories/consumable-operations";
import { updateConsumablePurchasePrice } from "@/lib/repositories/consumables";
import { getActionConfig } from "@/lib/repositories/action-configs";
import type { AssetOperationType } from "@/lib/types/operation";
import type { OperationTemplateMetadata } from "@/lib/types/operation-template";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import { coerceMoneyToCents } from "@/lib/utils/money";
import { updateExternalApprovalTodo } from "@/lib/integrations/dootask-todos";
import {
  extractOwnerFromOperationMetadata,
  inferAssetStatusFromAction,
  resolveTemplateMetadataFromSources,
} from "@/lib/utils/asset-state";
import {
  handleBorrowOperationCreated,
  handleReturnOperationCreated,
} from "@/lib/services/borrow-tracking";

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

type ApprovalCcRecipientRow = {
  approval_id: string;
  user_id: string;
  user_name: string | null;
  created_at: string;
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

function mapCcRow(row: ApprovalCcRecipientRow): ApprovalCcRecipient {
  return {
    userId: row.user_id,
    userName: row.user_name,
    createdAt: row.created_at,
  };
}

function normalizeCcRecipients(
  payload: CreateApprovalRequestPayload["cc"] | undefined,
) {
  if (!payload || payload.length === 0) return [];

  const seen = new Set<string>();
  const normalized: Array<{ id: string; name?: string }> = [];
  payload.forEach((entry) => {
    const id = typeof entry?.id === "string" ? entry.id.trim() : "";
    if (!id) return;
    if (seen.has(id)) return;
    seen.add(id);
    const name =
      typeof entry.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : undefined;
    normalized.push(name ? { id, name } : { id });
  });
  return normalized;
}

export function listApprovalCcRecipients(approvalId: string): ApprovalCcRecipient[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT approval_id, user_id, user_name, created_at
       FROM asset_approval_cc_recipients
       WHERE approval_id = ?
       ORDER BY created_at ASC`,
    )
    .all(approvalId) as ApprovalCcRecipientRow[];
  return rows.map(mapCcRow);
}

export function isApprovalCcRecipient(approvalId: string, userId: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT 1 as ok
       FROM asset_approval_cc_recipients
       WHERE approval_id = ? AND user_id = ?
       LIMIT 1`,
    )
    .get(approvalId, userId) as { ok: number } | undefined;
  return Boolean(row?.ok);
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
  } else if (filters?.role === "all" && filters.userId) {
    conditions.push(
      `(applicant_id = @userId OR approver_id = @userId OR id IN (SELECT approval_id FROM asset_approval_cc_recipients WHERE user_id = @userId))`,
    );
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

  const normalizedCc = normalizeCcRecipients(payload.cc);

  const insertApprovalStmt = db.prepare(
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
  );

  const insertCcStmt = db.prepare(
    `INSERT OR IGNORE INTO asset_approval_cc_recipients (
       approval_id,
       user_id,
       user_name,
       created_at
     ) VALUES (
       @approvalId,
       @userId,
       @userName,
       datetime('now')
     )`,
  );

  const runCreate = db.transaction(() => {
    const resolvedOperationId = (() => {
      if (payload.operationId) {
        return payload.operationId;
      }
      if (!payload.assetId) {
        return null;
      }
      const operationType = mapApprovalTypeToOperationType(payload.type);
      if (!operationType) {
        return null;
      }
      const actorLabel = payload.applicant.name?.trim() || payload.applicant.id;
      const metadata: Record<string, unknown> = {
        ...(payload.metadata ?? {}),
        autoGeneratedFromApprovalId: id,
        autoGeneratedFromApprovalType: payload.type,
        sourceApprovalTitle: payload.title,
        applicant: {
          id: payload.applicant.id,
          name: payload.applicant.name ?? null,
        },
      };
      const operation = createAssetOperation(payload.assetId, {
        type: operationType,
        actor: actorLabel,
        description: payload.title,
        status: "pending",
        metadata,
      });
      return operation.id;
    })();

    insertApprovalStmt.run({
      id,
      assetId: payload.assetId ?? null,
      consumableId: payload.consumableId ?? null,
      operationId: resolvedOperationId,
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

    normalizedCc.forEach((entry) => {
      insertCcStmt.run({
        approvalId: id,
        userId: entry.id,
        userName: entry.name ?? null,
      });
    });

    if (resolvedOperationId) {
      updateAssetOperationStatus(resolvedOperationId, "pending");
    }

    if (payload.consumableOperationId) {
      updateConsumableOperationStatus(payload.consumableOperationId, "pending");
    }
  });

  runCreate();

  return getApprovalRequestById(id)!;
}

const ACTION_STATUS_MAP: Record<ApprovalAction, ApprovalStatus> = {
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled",
};

const AUTO_OPERATION_APPROVAL_TYPES: ApprovalType[] = [
  "purchase",
  "receive",
  "borrow",
  "return",
  "maintenance",
  "dispose",
  "inbound",
];

type PurchaseAssetMode = "new" | "existing";

function resolvePurchaseAssetMode(
  metadata?: Record<string, unknown> | null,
): PurchaseAssetMode | null {
  if (!metadata) return null;
  const purchaseAsset = (metadata as { purchaseAsset?: unknown }).purchaseAsset;
  if (typeof purchaseAsset === "object" && purchaseAsset !== null) {
    const mode = (purchaseAsset as { mode?: unknown }).mode;
    if (mode === "new" || mode === "existing") {
      return mode;
    }
  }
  const legacyMode = (metadata as { purchaseAssetMode?: unknown })
    .purchaseAssetMode;
  if (legacyMode === "new" || legacyMode === "existing") {
    return legacyMode;
  }
  return null;
}

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
    case "maintenance":
      return "maintenance";
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

function linkApprovalToAsset(approvalId: string, assetId: string) {
  const db = getDb();
  db.prepare(
    `UPDATE asset_approval_requests
     SET asset_id = @assetId,
         updated_at = datetime('now')
     WHERE id = @approvalId`,
  ).run({ approvalId, assetId });
}

function ensureAssetCreatedForPurchase(approval: ApprovalRequest): ApprovalRequest {
  if (approval.assetId || approval.type !== "purchase") {
    return approval;
  }

  if (resolvePurchaseAssetMode(approval.metadata) === "existing") {
    return approval;
  }

  // Try to extract new asset info from metadata
  // The frontend should send something like metadata: { newAsset: { name, category, ... } }
  const metadata = approval.metadata ?? {};
  const newAssetData = (metadata.newAsset as Record<string, unknown>) ?? {};

  if (Object.keys(newAssetData).length === 0) {
    // If no asset data found, we cannot create an asset
    return approval;
  }

  const name = typeof newAssetData.name === "string" ? newAssetData.name : `New Asset - ${approval.title}`;
  const category = typeof newAssetData.category === "string" ? newAssetData.category : "general";
  const companyCode = typeof newAssetData.companyCode === "string" ? newAssetData.companyCode : "DEFAULT";
  // Default owner to applicant name; keep applicantId as fallback
  const owner =
    typeof newAssetData.owner === "string" && newAssetData.owner.trim()
      ? newAssetData.owner.trim()
      : approval.applicantName?.trim() || approval.applicantId;
  
  // Create the asset with "pending" status
  try {
    const asset = createAsset({
      name,
      category,
      status: "pending", 
      companyCode,
      owner,
      location: typeof newAssetData.location === "string" ? newAssetData.location : "To Be Assigned",
      purchaseDate: new Date().toISOString().slice(0, 10),
    });

    linkApprovalToAsset(approval.id, asset.id);
    return getApprovalRequestById(approval.id)!;
  } catch (e) {
    console.error("Failed to auto-create asset for purchase approval:", e);
    return approval;
  }
}

function maybeSyncPurchasePriceFromApproval(approval: ApprovalRequest) {
  if (!approval.assetId && !approval.consumableId) {
    return;
  }

  const syncRequested = Boolean(
    (approval.metadata as { syncPurchasePrice?: unknown } | null)?.syncPurchasePrice,
  );
  if (!syncRequested) {
    return;
  }

  const templateMetadata = extractOperationTemplateMetadata(
    approval.metadata ?? undefined,
  );
  const cost = (templateMetadata?.values as { cost?: unknown } | undefined)?.cost;
  const cents = coerceMoneyToCents(cost);
  if (cents === null) {
    return;
  }

  if (approval.assetId) {
    updateAssetPurchasePrice(approval.assetId, {
      purchasePriceCents: cents,
      purchaseCurrency: "CNY",
    });
  }
  if (approval.consumableId) {
    updateConsumablePurchasePrice(approval.consumableId, {
      purchasePriceCents: cents,
      purchaseCurrency: "CNY",
    });
  }
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
    if (operation.type !== "inbound") return false;
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
    applicant: {
      id: approval.applicantId,
      name: approval.applicantName ?? null,
    },
    ownerId: approval.applicantId,
    ownerName: approval.applicantName ?? null,
  };

  if (metadata) {
    metadataPayload.operationTemplate = metadata;
  }

  const operation = createAssetOperation(approval.assetId, {
    type: "inbound",
    actor: actor.name ?? actor.id ?? "system",
    status: "pending",
    description: `待入库 · ${approval.title}`,
    metadata: metadataPayload,
  });

  // If inbound配置需要审批，则自动创建一条入库审批请求
  const inboundConfig = getActionConfig("inbound");
  if (inboundConfig.requiresApproval) {
    const existingInboundApproval = listApprovalRequests({
      assetId: approval.assetId,
      operationId: operation.id,
      type: ["inbound"],
    });
    if (existingInboundApproval.data.length === 0) {
      const approverId =
        (inboundConfig.defaultApproverType === "user" &&
          inboundConfig.defaultApproverRefs[0]) ||
        approval.approverId ||
        actor.id;

      createApprovalRequest({
        type: "inbound",
        title: `入库确认 - ${approval.title}`,
        reason: approval.reason ?? undefined,
        assetId: approval.assetId,
        operationId: operation.id,
        applicant: {
          id: approval.applicantId,
          name: approval.applicantName ?? undefined,
        },
        approver: approverId
          ? {
              id: approverId,
              name: approval.approverName ?? actor.name,
            }
          : undefined,
        metadata: {
          ...metadataPayload,
          configSnapshot: {
            id: inboundConfig.id,
            requiresApproval: inboundConfig.requiresApproval,
            defaultApproverType: inboundConfig.defaultApproverType,
            allowOverride: inboundConfig.allowOverride,
          },
        },
      });
    }
  }
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

  if (operation.type === "borrow") {
    handleBorrowOperationCreated(approval.assetId, operation);
  } else if (operation.type === "return") {
    handleReturnOperationCreated(approval.assetId, operation);
  }

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

      const { id: assetId, companyCode, ...assetPayload } = asset;
      const resolvedCompanyCode = companyCode ?? "DEFAULT";
      const nextPayload = {
        ...assetPayload,
        companyCode: resolvedCompanyCode,
        status: targetStatus,
        owner: ownerFromMetadata ?? asset.owner,
      };

      updateAsset(assetId, nextPayload);
    }

    if (approval.type === "purchase") {
      const purchaseMode = resolvePurchaseAssetMode(approval.metadata);
      if (purchaseMode !== "existing") {
      ensurePendingInboundOperation(approval, templateMetadata, actor);
      }
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

  if (
    payload.action === "approve" &&
    typeof payload.syncPurchasePrice === "boolean"
  ) {
    const nextMetadata: Record<string, unknown> = {
      ...(existing.metadata ?? {}),
      syncPurchasePrice: payload.syncPurchasePrice,
    };
    db.prepare(
      `UPDATE asset_approval_requests
       SET metadata = @metadata,
           updated_at = @updatedAt
       WHERE id = @id`,
    ).run({
      id,
      metadata: JSON.stringify(nextMetadata),
      updatedAt: now,
    });
  }

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
    // Try to create asset for Purchase requests if missing
    updated = ensureAssetCreatedForPurchase(updated);

    maybeSyncPurchasePriceFromApproval(updated);
    
    updated = ensureOperationRecordForApproval(updated, payload.actor);
    applyApprovalSuccessEffects(updated, payload.actor);
  }
  void updateExternalApprovalTodo(updated, updated.externalTodoId);

  return updated;
}

export function reassignApprovalApprover(
  id: string,
  payload: {
    approver: { id: string; name?: string };
    actor: { id: string; name?: string };
  },
): ApprovalRequest {
  const existing = getApprovalRequestById(id);
  if (!existing) {
    throw new Error("审批请求不存在");
  }
  if (existing.status !== "pending") {
    throw new Error("该审批已处理，无法更换审批人");
  }

  const nextApproverId = payload.approver.id.trim();
  if (!nextApproverId) {
    throw new Error("缺少审批人信息");
  }

  const now = new Date().toISOString();
  const nextMetadata: Record<string, unknown> = {
    ...(existing.metadata ?? {}),
  };

  if (existing.approverId !== nextApproverId) {
    const history = Array.isArray(
      (nextMetadata as { approverReassignments?: unknown }).approverReassignments,
    )
      ? (nextMetadata as { approverReassignments: unknown[] }).approverReassignments
      : [];

    history.push({
      at: now,
      from: {
        id: existing.approverId ?? null,
        name: existing.approverName ?? null,
      },
      to: {
        id: nextApproverId,
        name: payload.approver.name ?? null,
      },
      actor: {
        id: payload.actor.id,
        name: payload.actor.name ?? null,
      },
    });

    (nextMetadata as { approverReassignments: unknown[] }).approverReassignments =
      history;
  }

  const db = getDb();
  db.prepare(
    `UPDATE asset_approval_requests
     SET approver_id = @approverId,
         approver_name = @approverName,
         metadata = @metadata,
         updated_at = @updatedAt
     WHERE id = @id`,
  ).run({
    id,
    approverId: nextApproverId,
    approverName: payload.approver.name ?? null,
    metadata: JSON.stringify(nextMetadata),
    updatedAt: now,
  });

  return getApprovalRequestById(id)!;
}

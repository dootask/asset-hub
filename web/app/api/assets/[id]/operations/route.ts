import { NextResponse } from "next/server";
import { createAssetOperation, listOperationsForAsset } from "@/lib/repositories/asset-operations";
import { getAssetById, updateAsset } from "@/lib/repositories/assets";
import { getActionConfig } from "@/lib/repositories/action-configs";
import {
  OPERATION_TYPES,
  type AssetOperation,
  type AssetOperationType,
  type CreateAssetOperationPayload,
} from "@/lib/types/operation";
import {
  extractOwnerFromOperationMetadata,
  inferAssetStatusFromAction,
} from "@/lib/utils/asset-state";
import { operationTypeToActionConfigId } from "@/lib/utils/action-config";
import {
  handleBorrowOperationCreated,
  handleReturnOperationCreated,
} from "@/lib/services/borrow-tracking";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { resolveServerFromRequest } from "@/lib/integrations/dootask-server-client";
import { isAdminUser } from "@/lib/utils/permissions";

const VALID_OPERATION_TYPES = OPERATION_TYPES.map((item) => item.value);

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const asset = getAssetById(id);
  if (!asset) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在" },
      { status: 404 },
    );
  }

  const operations = listOperationsForAsset(asset.id);
  return NextResponse.json({ data: operations });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeOperationPayload(
  payload: Partial<CreateAssetOperationPayload>,
): CreateAssetOperationPayload {
  if (
    !payload.type ||
    !VALID_OPERATION_TYPES.includes(payload.type as AssetOperationType)
  ) {
    throw new Error("Invalid operation type");
  }

  if (!payload.actor || typeof payload.actor !== "string") {
    throw new Error("Missing actor");
  }

  const metadata =
    payload.metadata && isRecord(payload.metadata)
      ? Object.fromEntries(
          Object.entries(payload.metadata).filter(
            ([, value]) =>
              typeof value === "string"
                ? value.trim().length > 0
                : value !== undefined && value !== null,
          ),
        )
      : undefined;

  return {
    type: payload.type,
    actor: payload.actor.trim(),
    description: payload.description?.trim() ?? "",
    metadata,
    status: payload.status,
  };
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以录入资产操作记录。" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const asset = getAssetById(id);
  if (!asset) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在" },
      { status: 404 },
    );
  }

  try {
    const payload = sanitizeOperationPayload(
      (await request.json()) as Partial<CreateAssetOperationPayload>,
    );

    const config = getActionConfig(operationTypeToActionConfigId(payload.type));
    if (config.requiresApproval) {
      return NextResponse.json(
        {
          error: "APPROVAL_REQUIRED",
          message: "该操作类型已配置为必须走审批，请在审批表单中提交请求。",
        },
        { status: 409 },
      );
    }

    const operation = createAssetOperation(id, payload);
    applyOperationSideEffects(asset, operation);
    if (operation.type === "borrow") {
      const user = extractUserFromRequest(request);
      const serverOrigin = resolveServerFromRequest(request);
      handleBorrowOperationCreated(asset.id, operation, {
        borrowerToken: user?.token ?? null,
        serverOrigin,
      });
    } else if (operation.type === "return") {
      handleReturnOperationCreated(asset.id, operation);
    }
    return NextResponse.json({ data: operation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message:
          error instanceof Error ? error.message : "请求参数不合法。",
      },
      { status: 400 },
    );
  }
}

function applyOperationSideEffects(asset: NonNullable<ReturnType<typeof getAssetById>>, operation: AssetOperation) {
  const targetStatus = inferAssetStatusFromAction(operation.type);
  if (!targetStatus) {
    return;
  }

  const nextOwner =
    extractOwnerFromOperationMetadata(operation.metadata ?? undefined) ??
    asset.owner;

  if (targetStatus === asset.status && nextOwner === asset.owner) {
    return;
  }

  updateAsset(asset.id, {
    name: asset.name,
    category: asset.category,
    status: targetStatus,
    companyCode: asset.companyCode ?? "DEFAULT",
    owner: nextOwner,
    location: asset.location,
    purchaseDate: asset.purchaseDate,
  });
}

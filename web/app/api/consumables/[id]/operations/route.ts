import { NextResponse } from "next/server";
import {
  createConsumableOperation,
  listOperationsForConsumable,
} from "@/lib/repositories/consumable-operations";
import { getConsumableById } from "@/lib/repositories/consumables";
import {
  CONSUMABLE_OPERATION_TYPES,
  type ConsumableOperationStatus,
  type ConsumableOperationType,
  type CreateConsumableOperationPayload,
} from "@/lib/types/consumable-operation";
import { getConsumableActionConfig } from "@/lib/config/consumable-action-configs";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

const VALID_TYPES = CONSUMABLE_OPERATION_TYPES.map((item) => item.value);
const VALID_STATUSES: ConsumableOperationStatus[] = ["pending", "done"];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function validateOperationDeltas(
  type: ConsumableOperationType,
  quantityDelta: number,
  reservedDelta: number,
) {
  switch (type) {
    case "purchase":
    case "inbound":
      if (quantityDelta <= 0) {
        throw new Error("入库/采购操作的 quantityDelta 必须为正数");
      }
      break;
    case "outbound":
    case "dispose":
      if (quantityDelta >= 0) {
        throw new Error("出库/处理操作的 quantityDelta 必须为负数");
      }
      break;
    case "reserve":
      if (reservedDelta <= 0) {
        throw new Error("预留操作的 reservedDelta 必须为正数");
      }
      break;
    case "release":
      if (reservedDelta >= 0) {
        throw new Error("释放预留操作的 reservedDelta 必须为负数");
      }
      break;
    case "adjust":
      if (quantityDelta === 0 && reservedDelta === 0) {
        throw new Error("库存调整至少需要提供一个非零的 delta");
      }
      break;
    default:
      break;
  }
}

function sanitizeOperationPayload(
  payload: unknown,
): CreateConsumableOperationPayload {
  if (!isRecord(payload)) {
    throw new Error("请求体必须是 JSON 对象");
  }

  const type = payload.type;
  if (
    typeof type !== "string" ||
    !VALID_TYPES.includes(type as ConsumableOperationType)
  ) {
    throw new Error("操作类型不合法");
  }

  const actor = payload.actor;
  if (typeof actor !== "string" || !actor.trim()) {
    throw new Error("缺少操作者信息");
  }

  const status =
    typeof payload.status === "string" &&
    VALID_STATUSES.includes(payload.status as ConsumableOperationStatus)
      ? (payload.status as ConsumableOperationStatus)
      : undefined;

  const quantityDelta = parseNumber(payload.quantityDelta, 0);
  const reservedDelta = parseNumber(payload.reservedDelta, 0);

  validateOperationDeltas(type as ConsumableOperationType, quantityDelta, reservedDelta);

  const metadata =
    payload.metadata && isRecord(payload.metadata)
      ? (payload.metadata as Record<string, unknown>)
      : undefined;

  return {
    type: type as ConsumableOperationType,
    actor: actor.trim(),
    description:
      typeof payload.description === "string"
        ? payload.description.trim()
        : undefined,
    status,
    quantityDelta,
    reservedDelta,
    metadata,
  };
}

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const consumable = getConsumableById(id);
  if (!consumable) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "耗材不存在" },
      { status: 404 },
    );
  }

  const operations = listOperationsForConsumable(id);
  return NextResponse.json({ data: operations });
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以手动录入耗材操作。" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const consumable = getConsumableById(id);
  if (!consumable) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "耗材不存在" },
      { status: 404 },
    );
  }

  try {
    const payload = sanitizeOperationPayload(await request.json());
    const actionConfig = getConsumableActionConfig(payload.type);
    const requiresApproval = actionConfig?.requiresApproval ?? false;
    const nextStatus: ConsumableOperationStatus =
      payload.status ?? (requiresApproval ? "pending" : "done");

    if (requiresApproval && nextStatus === "done") {
      return NextResponse.json(
        {
          error: "APPROVAL_REQUIRED",
          message: "该操作需要审批，请保持 status=pending 并发起审批。",
        },
        { status: 400 },
      );
    }

    const operation = createConsumableOperation(id, {
      ...payload,
      status: nextStatus,
    });

    return NextResponse.json(
      { data: operation, meta: { requiresApproval } },
      { status: 201 },
    );
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


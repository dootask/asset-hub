import { NextResponse } from "next/server";
import {
  deleteConsumable,
  getConsumableById,
  updateConsumable,
} from "@/lib/repositories/consumables";
import type { ConsumableStatus } from "@/lib/types/consumable";
import { CONSUMABLE_STATUSES } from "@/lib/types/consumable";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

const STATUS_ALLOW_LIST = new Set<ConsumableStatus>(CONSUMABLE_STATUSES);

interface RouteContext {
  params: Promise<{ id: string }>;
}

function sanitizePayload(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("请求体必须为对象");
  }
  const body = payload as Record<string, unknown>;
  const stringFields = ["name", "category", "unit", "keeper", "location"];
  stringFields.forEach((field) => {
    if (typeof body[field] !== "string" || !body[field]) {
      throw new Error(`${field} 为必填字段`);
    }
  });
  if (
    typeof body.status !== "string" ||
    !STATUS_ALLOW_LIST.has(body.status as ConsumableStatus)
  ) {
    throw new Error("状态值不合法");
  }
  const quantity = Number(body.quantity);
  const safetyStock = Number(body.safetyStock ?? body.safety_stock ?? 0);
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("quantity 必须为大于等于 0 的数字");
  }
  if (!Number.isFinite(safetyStock) || safetyStock < 0) {
    throw new Error("safetyStock 必须为大于等于 0 的数字");
  }
  return {
    name: (body.name as string).trim(),
    category: (body.category as string).trim(),
    status: body.status as ConsumableStatus,
    quantity,
    unit: (body.unit as string).trim(),
    keeper: (body.keeper as string).trim(),
    location: (body.location as string).trim(),
    safetyStock,
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : undefined,
    metadata:
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : undefined,
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const consumable = getConsumableById(id);
  if (!consumable) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "耗材不存在。" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: consumable });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以更新耗材。" },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const payload = sanitizePayload(await request.json());
    const updated = updateConsumable(id, payload);
    if (!updated) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "耗材不存在。" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_CONSUMABLE",
        message:
          error instanceof Error ? error.message : "更新耗材失败，请稍后重试。",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以删除耗材。" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const removed = deleteConsumable(id);
  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "耗材不存在。" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: { success: true } });
}


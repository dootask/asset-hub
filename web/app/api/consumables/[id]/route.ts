import { NextResponse } from "next/server";
import {
  deleteConsumable,
  getConsumableById,
  isConsumableNoInUse,
  updateConsumable,
} from "@/lib/repositories/consumables";
import type { ConsumableStatus } from "@/lib/types/consumable";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";
import { getCompanyByCode } from "@/lib/repositories/companies";

type StatusInput = ConsumableStatus | "archived" | undefined;

interface RouteContext {
  params: Promise<{ id: string }>;
}

function deriveStatus({
  status,
  quantity,
  reservedQuantity,
  safetyStock,
  currentStatus,
}: {
  status: StatusInput;
  quantity: number;
  reservedQuantity: number;
  safetyStock: number;
  currentStatus?: ConsumableStatus;
}): ConsumableStatus {
  if (status === "archived" || currentStatus === "archived") return "archived";
  if (quantity <= 0) return "out-of-stock";
  if (reservedQuantity >= quantity) return "reserved";
  if (safetyStock > 0 && quantity <= safetyStock) return "low-stock";
  return "in-stock";
}

function sanitizePayload(id: string, payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("请求体必须为对象");
  }
  const body = payload as Record<string, unknown>;
  const stringFields = ["name", "category", "unit", "keeper", "location", "companyCode"];
  stringFields.forEach((field) => {
    if (typeof body[field] !== "string" || !body[field]) {
      throw new Error(`${field} 为必填字段`);
    }
  });

  const consumableNoRaw =
    typeof body.consumableNo === "string" ? body.consumableNo : "";
  const consumableNo = consumableNoRaw.trim();
  if (consumableNo) {
    if (consumableNo.length > 64) {
      throw new Error("耗材编号过长");
    }
    if (isConsumableNoInUse(consumableNo, id)) {
      throw new Error("耗材编号已存在");
    }
  }

  const specModelRaw =
    typeof body.specModel === "string" ? body.specModel : "";
  const specModel = specModelRaw.trim();
  if (specModel && specModel.length > 255) {
    throw new Error("规格型号过长");
  }

  const purchaseCurrencyRaw =
    typeof body.purchaseCurrency === "string" ? body.purchaseCurrency : "";
  const purchaseCurrency = purchaseCurrencyRaw.trim() || "CNY";
  if (purchaseCurrency.length > 10) {
    throw new Error("采购币种不合法");
  }

  const statusInput =
    typeof body.status === "string" && body.status.trim().length > 0
      ? (body.status.trim() as StatusInput)
      : undefined;
  if (statusInput && statusInput !== "archived") {
    throw new Error("状态值不合法，仅允许 archived 或自动计算");
  }
  const quantity = Number(body.quantity);
  const safetyStock = Number(body.safetyStock ?? body.safety_stock ?? 0);
  const reservedQuantityRaw =
    body.reservedQuantity ?? body.reserved_quantity ?? null;
  const reservedQuantity =
    reservedQuantityRaw === null ? undefined : Number(reservedQuantityRaw);
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("quantity 必须为大于等于 0 的数字");
  }
  if (!Number.isFinite(safetyStock) || safetyStock < 0) {
    throw new Error("safetyStock 必须为大于等于 0 的数字");
  }
  if (reservedQuantity !== undefined && (!Number.isFinite(reservedQuantity) || reservedQuantity < 0)) {
    throw new Error("reservedQuantity 必须为大于等于 0 的数字");
  }
  if (reservedQuantity !== undefined && reservedQuantity > quantity) {
    throw new Error("reservedQuantity 不能大于 quantity");
  }

  let purchasePriceCents: number | null | undefined;
  const rawPrice = (body as { purchasePriceCents?: unknown }).purchasePriceCents;
  if (rawPrice === null || rawPrice === "") {
    purchasePriceCents = null;
  } else if (rawPrice !== undefined) {
    const asNumber = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
    if (!Number.isFinite(asNumber)) {
      throw new Error("采购价格必须为数字");
    }
    const asInteger = Math.trunc(asNumber);
    if (asInteger !== asNumber) {
      throw new Error("采购价格精度不合法");
    }
    if (asInteger < 0) {
      throw new Error("采购价格不能为负数");
    }
    purchasePriceCents = asInteger;
  }

  return {
    consumableNo,
    name: (body.name as string).trim(),
    specModel,
    category: (body.category as string).trim(),
    status: statusInput,
    companyCode: (body.companyCode as string).trim().toUpperCase(),
    quantity,
    reservedQuantity,
    unit: (body.unit as string).trim(),
    keeper: (body.keeper as string).trim(),
    location: (body.location as string).trim(),
    safetyStock,
    purchasePriceCents,
    purchaseCurrency,
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
    const existing = getConsumableById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "耗材不存在。" },
        { status: 404 },
      );
    }
    const payload = sanitizePayload(id, await request.json());
    if (!getCompanyByCode(payload.companyCode)) {
      throw new Error("公司不存在");
    }
    const reservedQuantity =
      payload.reservedQuantity ?? existing.reservedQuantity ?? 0;
    const nextStatus = deriveStatus({
      status: payload.status,
      currentStatus: existing.status,
      quantity: payload.quantity,
      reservedQuantity,
      safetyStock: payload.safetyStock,
    });
    const updated = updateConsumable(id, {
      ...payload,
      reservedQuantity,
      status: nextStatus,
    });
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

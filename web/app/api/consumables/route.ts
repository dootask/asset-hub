import { NextResponse } from "next/server";
import type { ConsumableStatus } from "@/lib/types/consumable";
import {
  createConsumable,
  listConsumables,
} from "@/lib/repositories/consumables";
import { CONSUMABLE_STATUSES } from "@/lib/types/consumable";
import { getCompanyByCode } from "@/lib/repositories/companies";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

const STATUS_ALLOW_LIST = new Set<ConsumableStatus>(CONSUMABLE_STATUSES);

function parseStatusParam(value: string | null): ConsumableStatus[] | undefined {
  if (!value) return undefined;
  const statuses = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is ConsumableStatus =>
      STATUS_ALLOW_LIST.has(entry as ConsumableStatus),
    );
  return statuses.length ? statuses : undefined;
}

function sanitizePayload(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("请求体必须为对象");
  }
  const payload = body as Record<string, unknown>;

  const stringFields = ["name", "category", "unit", "keeper", "location", "companyCode"];
  stringFields.forEach((field) => {
    if (typeof payload[field] !== "string" || !payload[field]) {
      throw new Error(`${field} 为必填字段`);
    }
  });

  if (
    typeof payload.status !== "string" ||
    !STATUS_ALLOW_LIST.has(payload.status as ConsumableStatus)
  ) {
    throw new Error("状态值不合法");
  }

  const quantity = Number(payload.quantity);
  const safetyStock = Number(payload.safetyStock ?? payload.safety_stock ?? 0);
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("quantity 必须为大于等于 0 的数字");
  }
  if (!Number.isFinite(safetyStock) || safetyStock < 0) {
    throw new Error("safetyStock 必须为大于等于 0 的数字");
  }

  return {
    name: (payload.name as string).trim(),
    category: (payload.category as string).trim(),
    status: payload.status as ConsumableStatus,
    companyCode: (payload.companyCode as string).trim().toUpperCase(),
    quantity,
    unit: (payload.unit as string).trim(),
    keeper: (payload.keeper as string).trim(),
    location: (payload.location as string).trim(),
    safetyStock,
    description:
      typeof payload.description === "string" && payload.description.trim()
        ? payload.description.trim()
        : undefined,
    metadata:
      payload.metadata && typeof payload.metadata === "object"
        ? (payload.metadata as Record<string, unknown>)
        : undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyParam = searchParams.get("company");
  const normalizedCompany =
    companyParam && companyParam.trim().length > 0
      ? companyParam.trim().toUpperCase()
      : undefined;
  const result = listConsumables({
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    companyCode: normalizedCompany,
    status: parseStatusParam(searchParams.get("status")),
    page: Number(searchParams.get("page")),
    pageSize: Number(searchParams.get("pageSize")),
  });
  return NextResponse.json({ data: result });
}

export async function POST(request: Request) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以创建耗材。" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const payload = sanitizePayload(body);
    if (!getCompanyByCode(payload.companyCode)) {
      throw new Error("公司不存在");
    }
    const consumable = createConsumable(payload);
    return NextResponse.json({ data: consumable }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_CONSUMABLE",
        message:
          error instanceof Error ? error.message : "创建耗材失败，请稍后重试。",
      },
      { status: 400 },
    );
  }
}


import { NextResponse } from "next/server";
import { createAsset, isAssetNoInUse, listAssets } from "@/lib/repositories/assets";
import { getAssetCategoryByCode } from "@/lib/repositories/asset-categories";
import type { AssetStatus, CreateAssetPayload } from "@/lib/types/asset";
import { ASSET_STATUSES } from "@/lib/types/asset";
import { getCompanyByCode } from "@/lib/repositories/companies";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

function sanitizeOptionalDate(value: unknown, fieldLabel: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${fieldLabel}格式不合法`);
  }
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${fieldLabel}格式必须为 YYYY-MM-DD`);
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldLabel}不是有效日期`);
  }
  return normalized;
}

function sanitizeOptionalText(value: unknown, fieldLabel: string, maxLen: number): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${fieldLabel}格式不合法`);
  }
  if (!value.trim()) {
    return "";
  }
  if (value.length > maxLen) {
    throw new Error(`${fieldLabel}过长`);
  }
  return value;
}

function parseStatuses(searchParams: URLSearchParams): AssetStatus[] | undefined {
  const rawStatuses = [
    ...searchParams.getAll("status"),
    ...(searchParams.get("status")?.split(",") ?? []),
  ].filter(Boolean);

  const normalized = Array.from(new Set(rawStatuses)).filter((value) =>
    ASSET_STATUSES.includes(value as AssetStatus),
  ) as AssetStatus[];

  return normalized.length ? normalized : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const status = parseStatuses(searchParams);
  const company = searchParams.get("company") ?? undefined;
  const normalizedCompany =
    company && company.trim().length > 0 ? company.trim().toUpperCase() : undefined;

  const result = listAssets({
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
    search: search?.trim() || undefined,
    category: category?.trim() || undefined,
    companyCode: normalizedCompany,
    status,
  });

  return NextResponse.json({
    data: result.items,
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
}

function sanitizePayload(payload: Partial<CreateAssetPayload>): CreateAssetPayload {
  const requiredFields: Array<keyof CreateAssetPayload> = [
    "name",
    "category",
    "status",
    "companyCode",
    "owner",
    "location",
    "purchaseDate",
  ];

  for (const field of requiredFields) {
    if (typeof payload[field] !== "string" || !payload[field]?.trim()) {
      throw new Error(`Missing field: ${field}`);
    }
  }

  if (!ASSET_STATUSES.includes(payload.status as AssetStatus)) {
    throw new Error("Invalid asset status");
  }

  const category = getAssetCategoryByCode(payload.category!);
  if (!category) {
    throw new Error("Invalid asset category");
  }

  const companyCode = payload.companyCode?.trim();
  if (!companyCode) {
    throw new Error("缺少公司编码");
  }
  const normalizedCompanyCode = companyCode.toUpperCase();
  const company = getCompanyByCode(normalizedCompanyCode);
  if (!company) {
    throw new Error("公司不存在");
  }

  const assetNoRaw = typeof payload.assetNo === "string" ? payload.assetNo : "";
  const assetNo = assetNoRaw.trim();
  if (assetNo) {
    if (assetNo.length > 64) {
      throw new Error("资产编号过长");
    }
    if (isAssetNoInUse(assetNo)) {
      throw new Error("资产编号已存在");
    }
  }

  const specModelRaw = typeof payload.specModel === "string" ? payload.specModel : "";
  const specModel = specModelRaw.trim();
  if (specModel && specModel.length > 255) {
    throw new Error("规格型号过长");
  }

  const purchaseCurrencyRaw =
    typeof payload.purchaseCurrency === "string" ? payload.purchaseCurrency : "";
  const purchaseCurrency = purchaseCurrencyRaw.trim() || "CNY";
  if (purchaseCurrency.length > 10) {
    throw new Error("采购币种不合法");
  }

  let purchasePriceCents: number | null | undefined;
  const rawPrice = (payload as { purchasePriceCents?: unknown }).purchasePriceCents;
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
    ...payload,
    companyCode: company.code,
    assetNo: assetNo || undefined,
    specModel: specModel || undefined,
    expiresAt: sanitizeOptionalDate((payload as { expiresAt?: unknown }).expiresAt, "过期时间"),
    note: sanitizeOptionalText((payload as { note?: unknown }).note, "备注", 5000),
    purchasePriceCents,
    purchaseCurrency,
  } as CreateAssetPayload;
}

export async function POST(request: Request) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以创建资产。" },
      { status: 403 },
    );
  }

  try {
    const rawPayload = (await request.json()) as Partial<CreateAssetPayload>;
    const payload = sanitizePayload(rawPayload);
    const newAsset = createAsset(payload);

    return NextResponse.json({ data: newAsset }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message:
          error instanceof Error
            ? error.message
            : "提交的资产数据不合法，请检查字段是否完整。",
      },
      { status: 400 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  deleteAsset,
  getAssetById,
  isAssetNoInUse,
  updateAsset,
} from "@/lib/repositories/assets";
import { getAssetCategoryByCode } from "@/lib/repositories/asset-categories";
import type { CreateAssetPayload } from "@/lib/types/asset";
import { getCompanyByCode } from "@/lib/repositories/companies";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

function sanitizePayload(
  id: string,
  payload: Partial<CreateAssetPayload>,
): CreateAssetPayload {
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

  if (!getAssetCategoryByCode(payload.category!)) {
    throw new Error("Invalid asset category");
  }

  const normalizedCompanyCode = payload.companyCode!.trim().toUpperCase();
  if (!getCompanyByCode(normalizedCompanyCode)) {
    throw new Error("Invalid company code");
  }

  const assetNoRaw = typeof payload.assetNo === "string" ? payload.assetNo : "";
  const assetNo = assetNoRaw.trim();
  if (assetNo) {
    if (assetNo.length > 64) {
      throw new Error("资产编号过长");
    }
    if (isAssetNoInUse(assetNo, id)) {
      throw new Error("资产编号已存在");
    }
  }

  const specModelRaw =
    typeof payload.specModel === "string" ? payload.specModel : "";
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
    companyCode: normalizedCompanyCode,
    assetNo,
    specModel,
    purchasePriceCents,
    purchaseCurrency,
  } as CreateAssetPayload;
}

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const asset = getAssetById(id);

  if (!asset) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在或已被删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: asset });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以更新资产。" },
      { status: 403 },
    );
  }

  try {
    const rawPayload = (await request.json()) as Partial<CreateAssetPayload>;
    const payload = sanitizePayload(id, rawPayload);
    const updated = updateAsset(id, payload);

    if (!updated) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "资产不存在或已被删除。" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message:
          error instanceof Error
            ? error.message
            : "请求内容不合法。",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以删除资产。" },
      { status: 403 },
    );
  }

  const removed = deleteAsset(id);

  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在或已被删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}

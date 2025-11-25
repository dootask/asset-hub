import { NextResponse } from "next/server";
import {
  deleteAsset,
  getAssetById,
  updateAsset,
} from "@/lib/repositories/assets";
import { getAssetCategoryByCode } from "@/lib/repositories/asset-categories";
import type { CreateAssetPayload } from "@/lib/types/asset";
import { getCompanyByCode } from "@/lib/repositories/companies";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_: Request, { params }: RouteParams) {
  const asset = getAssetById(params.id);

  if (!asset) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在或已被删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: asset });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以更新资产。" },
      { status: 403 },
    );
  }

  try {
    const payload = (await request.json()) as CreateAssetPayload;
    if (!getAssetCategoryByCode(payload.category)) {
      throw new Error("Invalid asset category");
    }
    const normalizedCompanyCode = payload.companyCode?.trim();
    if (!normalizedCompanyCode || !getCompanyByCode(normalizedCompanyCode)) {
      throw new Error("Invalid company code");
    }
    const updated = updateAsset(params.id, {
      ...payload,
      companyCode: normalizedCompanyCode,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "资产不存在或已被删除。" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", message: "请求内容不合法。" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以删除资产。" },
      { status: 403 },
    );
  }

  const removed = deleteAsset(params.id);

  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在或已被删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}


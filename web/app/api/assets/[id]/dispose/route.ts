import { NextResponse } from "next/server";
import { getAssetById, updateAsset } from "@/lib/repositories/assets";
import { createAssetOperation } from "@/lib/repositories/asset-operations";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  const checkUser = extractUserFromRequest(request);
  if (!isAdminUser(checkUser?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以执行资产报废。" },
      { status: 403 },
    );
  }

  const asset = getAssetById(params.id);
  if (!asset) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在" },
      { status: 404 },
    );
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      reason?: string;
      actor?: { id?: string; name?: string };
    };
    const requestUser = extractUserFromRequest(request);
    const actorId = requestUser?.id ?? payload.actor?.id;
    const actorName = requestUser?.nickname ?? payload.actor?.name;

    if (!actorId) {
      return NextResponse.json(
        { error: "USER_CONTEXT_REQUIRED", message: "缺少操作人信息，无法报废资产。" },
        { status: 401 },
      );
    }

    const updated = updateAsset(asset.id, {
      name: asset.name,
      category: asset.category,
      status: "retired",
      companyCode: asset.companyCode ?? "DEFAULT",
      owner: asset.owner,
      location: asset.location,
      purchaseDate: asset.purchaseDate,
    });

    createAssetOperation(asset.id, {
      type: "dispose",
      description: payload.reason?.trim()
        ? payload.reason.trim()
        : "资产已报废",
      actor: actorName ? `${actorName} (${actorId})` : actorId,
      metadata: payload.reason?.trim() ? { reason: payload.reason.trim() } : undefined,
    });

    return NextResponse.json({
      data: {
        ...updated,
        status: "retired",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "DISPOSE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "无法执行报废操作，请稍后再试。",
      },
      { status: 500 },
    );
  }
}


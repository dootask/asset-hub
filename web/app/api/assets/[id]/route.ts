import { NextResponse } from "next/server";
import {
  deleteAsset,
  getAssetById,
  updateAsset,
} from "@/lib/repositories/assets";
import type { CreateAssetPayload } from "@/lib/types/asset";

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
  try {
    const payload = (await request.json()) as CreateAssetPayload;
    const updated = updateAsset(params.id, payload);

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

export async function DELETE(_: Request, { params }: RouteParams) {
  const removed = deleteAsset(params.id);

  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在或已被删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}


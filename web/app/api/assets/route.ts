import { NextResponse } from "next/server";
import { createAsset, listAssets } from "@/lib/repositories/assets";
import type { CreateAssetPayload } from "@/lib/types/asset";

export async function GET() {
  return NextResponse.json({
    data: listAssets(),
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateAssetPayload;
    const newAsset = createAsset(payload);

    return NextResponse.json({ data: newAsset }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: "提交的资产数据不合法，请检查字段是否完整。",
      },
      { status: 400 },
    );
  }
}


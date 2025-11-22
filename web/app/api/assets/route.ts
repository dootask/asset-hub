import { NextResponse } from "next/server";
import { createAsset, listAssets } from "@/lib/repositories/assets";
import { getAssetCategoryByCode } from "@/lib/repositories/asset-categories";
import type { AssetStatus, CreateAssetPayload } from "@/lib/types/asset";
import { ASSET_STATUSES } from "@/lib/types/asset";

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

  const result = listAssets({
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
    search: search?.trim() || undefined,
    category: category?.trim() || undefined,
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

  return payload as CreateAssetPayload;
}

export async function POST(request: Request) {
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

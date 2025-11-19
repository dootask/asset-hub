import { NextResponse } from "next/server";
import {
  createAssetOperation,
  listOperationsForAsset,
} from "@/lib/repositories/asset-operations";
import { getAssetById } from "@/lib/repositories/assets";
import {
  OPERATION_TYPES,
  type AssetOperationType,
  type CreateAssetOperationPayload,
} from "@/lib/types/operation";

const VALID_OPERATION_TYPES = OPERATION_TYPES.map((item) => item.value);

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const asset = getAssetById(id);
  if (!asset) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在" },
      { status: 404 },
    );
  }

  const operations = listOperationsForAsset(asset.id);
  return NextResponse.json({ data: operations });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeOperationPayload(
  payload: Partial<CreateAssetOperationPayload>,
): CreateAssetOperationPayload {
  if (
    !payload.type ||
    !VALID_OPERATION_TYPES.includes(payload.type as AssetOperationType)
  ) {
    throw new Error("Invalid operation type");
  }

  if (!payload.actor || typeof payload.actor !== "string") {
    throw new Error("Missing actor");
  }

  const metadata =
    payload.metadata && isRecord(payload.metadata)
      ? Object.fromEntries(
          Object.entries(payload.metadata).filter(
            ([, value]) =>
              typeof value === "string"
                ? value.trim().length > 0
                : value !== undefined && value !== null,
          ),
        )
      : undefined;

  return {
    type: payload.type,
    actor: payload.actor.trim(),
    description: payload.description?.trim() ?? "",
    metadata,
    status: payload.status,
  };
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const asset = getAssetById(id);
  if (!asset) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在" },
      { status: 404 },
    );
  }

  try {
    const payload = sanitizeOperationPayload(
      (await request.json()) as Partial<CreateAssetOperationPayload>,
    );

    const operation = createAssetOperation(id, payload);
    return NextResponse.json({ data: operation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message:
          error instanceof Error ? error.message : "请求参数不合法。",
      },
      { status: 400 },
    );
  }
}


import { NextResponse } from "next/server";
import {
  deleteConsumableCategory,
  updateConsumableCategory,
} from "@/lib/repositories/consumable-categories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function sanitizePayload(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("请求体必须为对象");
  }
  const payload = body as Record<string, unknown>;
  const requiredFields: Array<keyof typeof payload> = ["labelZh", "labelEn"];
  requiredFields.forEach((field) => {
    if (typeof payload[field] !== "string" || !(payload[field] as string).trim()) {
      throw new Error(`${field} 为必填字段`);
    }
  });
  return {
    labelZh: (payload.labelZh as string).trim(),
    labelEn: (payload.labelEn as string).trim(),
    description:
      typeof payload.description === "string" && payload.description.trim()
        ? payload.description.trim()
        : undefined,
    unit:
      typeof payload.unit === "string" && payload.unit.trim()
        ? payload.unit.trim()
        : undefined,
  };
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = sanitizePayload(await request.json());
    const updated = updateConsumableCategory(id, payload);
    if (!updated) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "耗材分类不存在。" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_CATEGORY",
        message:
          error instanceof Error ? error.message : "保存耗材分类失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const removed = deleteConsumableCategory(id);
  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "耗材分类不存在或已被使用。" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: { success: true } });
}


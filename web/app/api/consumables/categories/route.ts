import { NextResponse } from "next/server";
import {
  createConsumableCategory,
  listConsumableCategories,
} from "@/lib/repositories/consumable-categories";

function sanitizePayload(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("请求体必须为对象");
  }
  const payload = body as Record<string, unknown>;
  const requiredFields: Array<keyof typeof payload> = [
    "code",
    "labelZh",
    "labelEn",
  ];
  requiredFields.forEach((field) => {
    if (typeof payload[field] !== "string" || !(payload[field] as string).trim()) {
      throw new Error(`${field} 为必填字段`);
    }
  });
  return {
    code: (payload.code as string).trim(),
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

export async function GET() {
  const data = listConsumableCategories();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = sanitizePayload(body);
    const category = createConsumableCategory(payload);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_CATEGORY",
        message:
          error instanceof Error ? error.message : "创建耗材类别失败，请稍后重试。",
      },
      { status: 400 },
    );
  }
}


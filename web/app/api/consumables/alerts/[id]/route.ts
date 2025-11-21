import { NextResponse } from "next/server";
import {
  propagateAlertResolution,
  resolveConsumableAlertById,
} from "@/lib/repositories/consumable-alerts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (body?.status !== "resolved") {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: "仅支持将状态更新为 resolved。",
      },
      { status: 400 },
    );
  }
  const alert = resolveConsumableAlertById(id);
  if (!alert) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "告警不存在或已处理。" },
      { status: 404 },
    );
  }
  await propagateAlertResolution(alert);
  return NextResponse.json({ data: alert });
}


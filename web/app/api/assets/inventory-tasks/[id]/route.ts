import { NextResponse } from "next/server";
import {
  getInventoryTaskById,
  updateInventoryTaskStatus,
} from "@/lib/repositories/inventory-tasks";
import type { InventoryTaskStatus } from "@/lib/types/inventory";

const VALID_STATUS: InventoryTaskStatus[] = [
  "draft",
  "in-progress",
  "completed",
];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const task = getInventoryTaskById(id);
  if (!task) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "盘点任务不存在。" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: task });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.status !== "string") {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", message: "缺少状态字段。" },
      { status: 400 },
    );
  }
  if (!VALID_STATUS.includes(body.status as InventoryTaskStatus)) {
    return NextResponse.json(
      { error: "INVALID_STATUS", message: "状态不合法。" },
      { status: 400 },
    );
  }
  const updated = updateInventoryTaskStatus(id, body.status as InventoryTaskStatus);
  if (!updated) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "盘点任务不存在。" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: updated });
}


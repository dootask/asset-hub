import { NextResponse } from "next/server";
import {
  createConsumableInventoryTask,
  listConsumableInventoryTasks,
} from "@/lib/repositories/consumable-inventory";
import type {
  ConsumableInventoryTaskStatus,
  CreateConsumableInventoryTaskPayload,
} from "@/lib/types/consumable-inventory";

const TASK_STATUSES: ConsumableInventoryTaskStatus[] = [
  "draft",
  "in-progress",
  "completed",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeCreatePayload(body: unknown): CreateConsumableInventoryTaskPayload {
  if (!isRecord(body)) {
    throw new Error("请求体必须是 JSON 对象");
  }

  const name = body.name;
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("请填写盘点任务名称");
  }

  const payload: CreateConsumableInventoryTaskPayload = {
    name: name.trim(),
  };

  if (typeof body.description === "string") {
    payload.description = body.description.trim();
  }

  if (typeof body.owner === "string" && body.owner.trim()) {
    payload.owner = body.owner.trim();
  }

  if (typeof body.scope === "string" && body.scope.trim()) {
    payload.scope = body.scope.trim();
  }

  if (body.filters && isRecord(body.filters)) {
    const filters: Record<string, unknown> = {};
    const rawCategories = body.filters.categories;
    if (Array.isArray(rawCategories)) {
      const categories = rawCategories
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        .map((entry) => entry.trim());
      if (categories.length) {
        filters.categories = categories;
      }
    }
    const keeper = body.filters.keeper;
    if (typeof keeper === "string" && keeper.trim()) {
      filters.keeper = keeper.trim();
    }
    if (Object.keys(filters).length) {
      payload.filters = filters;
    }
  }

  if (
    typeof body.status === "string" &&
    TASK_STATUSES.includes(body.status as ConsumableInventoryTaskStatus)
  ) {
    payload.status = body.status as ConsumableInventoryTaskStatus;
  }

  return payload;
}

export async function GET() {
  const data = listConsumableInventoryTasks();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  try {
    const payload = sanitizeCreatePayload(await request.json());
    const task = createConsumableInventoryTask(payload);
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message:
          error instanceof Error ? error.message : "请求参数不合法，请检查后重试。",
      },
      { status: 400 },
    );
  }
}


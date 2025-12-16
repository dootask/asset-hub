import { NextResponse } from "next/server";
import {
  createInventoryTask,
  listInventoryTasks,
} from "@/lib/repositories/inventory-tasks";
import type {
  CreateInventoryTaskPayload,
  InventoryTaskStatus,
} from "@/lib/types/inventory";
import { ensureAdminApiAccess } from "@/lib/server/api-guards";

const VALID_STATUS: InventoryTaskStatus[] = [
  "draft",
  "in-progress",
  "completed",
];

function sanitizePayload(payload: unknown): CreateInventoryTaskPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Payload must be an object");
  }
  const { name, scope, filters, owner, description, status } = payload as Record<
    string,
    unknown
  >;
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("任务名称不能为空");
  }
  if (status && (!VALID_STATUS.includes(status as InventoryTaskStatus))) {
    throw new Error("状态值不合法");
  }
  return {
    name: name.trim(),
    scope: typeof scope === "string" && scope.trim() ? scope.trim() : undefined,
    filters:
      filters && typeof filters === "object"
        ? (filters as Record<string, unknown>)
        : undefined,
    owner: typeof owner === "string" && owner.trim() ? owner.trim() : undefined,
    description:
      typeof description === "string" && description.trim()
        ? description.trim()
        : undefined,
    status: status as InventoryTaskStatus | undefined,
  };
}

export async function GET(request: Request) {
  const forbidden = ensureAdminApiAccess(request, "只有系统管理员可以查看盘点任务。");
  if (forbidden) return forbidden;
  const tasks = listInventoryTasks();
  return NextResponse.json({ data: tasks });
}

export async function POST(request: Request) {
  const forbidden = ensureAdminApiAccess(request, "只有系统管理员可以创建盘点任务。");
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const payload = sanitizePayload(body);
    const task = createInventoryTask(payload);
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_TASK",
        message:
          error instanceof Error ? error.message : "创建盘点任务失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}

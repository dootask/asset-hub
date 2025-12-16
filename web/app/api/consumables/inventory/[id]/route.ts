import { NextResponse } from "next/server";
import { getConsumableInventoryTask, updateConsumableInventoryTask } from "@/lib/repositories/consumable-inventory";
import type { ConsumableInventoryTaskStatus, UpdateConsumableInventoryTaskPayload } from "@/lib/types/consumable-inventory";
import { ensureAdminApiAccess } from "@/lib/server/api-guards";

const TASK_STATUSES: ConsumableInventoryTaskStatus[] = [
  "draft",
  "in-progress",
  "completed",
];

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeUpdatePayload(body: unknown): UpdateConsumableInventoryTaskPayload {
  if (!isRecord(body)) {
    throw new Error("请求体必须是 JSON 对象");
  }

  const payload: UpdateConsumableInventoryTaskPayload = {};

  if (
    typeof body.status === "string" &&
    TASK_STATUSES.includes(body.status as ConsumableInventoryTaskStatus)
  ) {
    payload.status = body.status as ConsumableInventoryTaskStatus;
  }

  if (Array.isArray(body.entries)) {
    const entries = body.entries
      .filter((entry): entry is Record<string, unknown> => isRecord(entry) && typeof entry.id === "string")
      .map((entry) => {
        const normalized: {
          id: string;
          actualQuantity?: number | null;
          actualReserved?: number | null;
          note?: string | null;
        } = { id: entry.id as string };

        if (entry.actualQuantity === null || entry.actualQuantity === undefined) {
          normalized.actualQuantity = null;
        } else if (
          typeof entry.actualQuantity === "number" ||
          (typeof entry.actualQuantity === "string" && entry.actualQuantity.trim())
        ) {
          const value =
            typeof entry.actualQuantity === "number"
              ? entry.actualQuantity
              : Number(entry.actualQuantity);
          if (!Number.isFinite(value)) {
            throw new Error("实盘数量必须是数字");
          }
          normalized.actualQuantity = Math.round(value);
        }

        if (entry.actualReserved === null || entry.actualReserved === undefined) {
          normalized.actualReserved = null;
        } else if (
          typeof entry.actualReserved === "number" ||
          (typeof entry.actualReserved === "string" && entry.actualReserved.trim())
        ) {
          const value =
            typeof entry.actualReserved === "number"
              ? entry.actualReserved
              : Number(entry.actualReserved);
          if (!Number.isFinite(value)) {
            throw new Error("实盘预留数量必须是数字");
          }
          normalized.actualReserved = Math.round(value);
        }

        if (typeof entry.note === "string") {
          normalized.note = entry.note.trim();
        }

        return normalized;
      });

    if (entries.length > 0) {
      payload.entries = entries;
    }
  }

  if (!payload.status && !payload.entries?.length) {
    throw new Error("没有可更新的字段");
  }

  return payload;
}

export async function GET(_: Request, { params }: RouteContext) {
  const forbidden = ensureAdminApiAccess(_, "只有系统管理员可以查看盘点任务详情。");
  if (forbidden) return forbidden;

  const { id } = await params;
  const task = getConsumableInventoryTask(id);
  if (!task) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "盘点任务不存在" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: task });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const forbidden = ensureAdminApiAccess(request, "只有系统管理员可以更新盘点任务。");
  if (forbidden) return forbidden;

  const { id } = await params;
  try {
    const payload = sanitizeUpdatePayload(await request.json());
    const updated = updateConsumableInventoryTask(id, payload);
    if (!updated) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "盘点任务不存在" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: error instanceof Error ? error.message : "请求参数不合法",
      },
      { status: 400 },
    );
  }
}

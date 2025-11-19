import { NextResponse } from "next/server";
import type { ApprovalActionPayload } from "@/lib/types/approval";
import { applyApprovalAction } from "@/lib/repositories/approvals";
import { completeApprovalTodo } from "@/lib/integrations/dootask-approvals";

interface RouteParams {
  params: {
    id: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeActionPayload(payload: unknown): ApprovalActionPayload {
  if (!isRecord(payload)) {
    throw new Error("请求体必须是 JSON 对象");
  }

  const action = payload.action;
  if (
    action !== "approve" &&
    action !== "reject" &&
    action !== "cancel"
  ) {
    throw new Error("不支持的审批操作");
  }

  if (!isRecord(payload.actor) || typeof payload.actor.id !== "string") {
    throw new Error("缺少操作人信息");
  }

  return {
    action,
    comment:
      typeof payload.comment === "string" ? payload.comment.trim() : undefined,
    actor: {
      id: payload.actor.id,
      name: typeof payload.actor.name === "string" ? payload.actor.name : undefined,
    },
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const payload = sanitizeActionPayload(await request.json());
    const approval = applyApprovalAction(params.id, payload);

     if (
      approval.externalTodoId &&
      (approval.status === "approved" ||
        approval.status === "rejected" ||
        approval.status === "cancelled")
    ) {
      await completeApprovalTodo({
        externalId: approval.externalTodoId,
        requestId: approval.id,
        status: approval.status,
        result: approval.result,
      });
    }

    return NextResponse.json({ data: approval });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "无法处理审批请求";

    const status =
      message.includes("不存在") ? 404 : message.includes("无法再次操作") ? 409 : 400;

    return NextResponse.json(
      { error: "APPROVAL_ACTION_FAILED", message },
      { status },
    );
  }
}



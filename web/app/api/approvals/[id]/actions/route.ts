import { NextResponse } from "next/server";
import type { ApprovalActionPayload, ApprovalRequest } from "@/lib/types/approval";
import { applyApprovalAction, getApprovalRequestById } from "@/lib/repositories/approvals";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { canApproveUser, isAdminUser } from "@/lib/utils/permissions";
import { notifyApprovalUpdated } from "@/lib/services/approval-notifications";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeActionPayload(payload: unknown): {
  action: ApprovalActionPayload["action"];
  comment?: string;
} {
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

  return {
    action,
    comment:
      typeof payload.comment === "string" ? payload.comment.trim() : undefined,
  };
}

function canApprove(approval: ApprovalRequest, userId: string) {
  if (approval.approverId && approval.approverId === userId) {
    return true;
  }
  return canApproveUser(userId);
}

function canCancel(approval: ApprovalRequest, userId: string) {
  return approval.applicantId === userId || isAdminUser(userId);
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const rawBody = await request.json();
    const payload = sanitizeActionPayload(rawBody);

    const currentUser =
      extractUserFromRequest(request) ??
      (isRecord(rawBody.actor) && typeof rawBody.actor.id === "string"
        ? {
            id: rawBody.actor.id,
            nickname:
              typeof rawBody.actor.name === "string" ? rawBody.actor.name : undefined,
          }
        : null);

    if (!currentUser?.id) {
      return NextResponse.json(
        {
          error: "USER_CONTEXT_REQUIRED",
          message: "缺少用户身份信息，无法执行审批操作。",
        },
        { status: 401 },
      );
    }

    const { id } = await params;

    const existing = getApprovalRequestById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "审批请求不存在" },
        { status: 404 },
      );
    }

    if (
      (payload.action === "approve" || payload.action === "reject") &&
      !canApprove(existing, currentUser.id)
    ) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "当前用户没有审批该请求的权限。",
        },
        { status: 403 },
      );
    }

    if (payload.action === "cancel" && !canCancel(existing, currentUser.id)) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "只有申请人或管理员可以撤销该审批。",
        },
        { status: 403 },
      );
    }

    const approval = applyApprovalAction(id, {
      ...payload,
      actor: {
        id: currentUser.id,
        name: currentUser.nickname,
      },
    });

    void (async () => {
      await notifyApprovalUpdated({
        request,
        approval,
        actorName: currentUser.nickname ?? currentUser.id,
      });
    })();

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

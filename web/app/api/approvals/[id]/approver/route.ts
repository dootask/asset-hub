import { NextResponse } from "next/server";
import { getActionConfig } from "@/lib/repositories/action-configs";
import {
  getApprovalRequestById,
  reassignApprovalApprover,
} from "@/lib/repositories/approvals";
import { resolveApproverFromConfig } from "@/lib/services/approval-approver";
import { notifyApprovalReassigned } from "@/lib/services/approval-notifications";
import { reassignExternalApprovalTodo } from "@/lib/integrations/dootask-todos";
import { approvalTypeToActionConfigId } from "@/lib/utils/action-config";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { canApproveUser, isAdminUser } from "@/lib/utils/permissions";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizePayload(payload: unknown): {
  approver: { id: string; name?: string };
  actor?: { id: string; name?: string };
  comment?: string;
} {
  if (!isRecord(payload)) {
    throw new Error("请求体必须是 JSON 对象");
  }

  const approver = payload.approver;
  if (!isRecord(approver) || typeof approver.id !== "string" || !approver.id.trim()) {
    throw new Error("缺少审批人信息");
  }

  const rawComment = payload.comment;
  const comment =
    typeof rawComment === "string" && rawComment.trim() ? rawComment.trim() : undefined;

  const actor = payload.actor;
  return {
    approver: {
      id: approver.id.trim(),
      name: typeof approver.name === "string" && approver.name.trim()
        ? approver.name.trim()
        : undefined,
    },
    actor:
      isRecord(actor) && typeof actor.id === "string" && actor.id.trim()
        ? {
            id: actor.id.trim(),
            name:
              typeof actor.name === "string" && actor.name.trim()
                ? actor.name.trim()
                : undefined,
          }
        : undefined,
    comment,
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const rawBody = await request.json();
    const payload = sanitizePayload(rawBody);

    const currentUser =
      extractUserFromRequest(request) ??
      (payload.actor
        ? { id: payload.actor.id, nickname: payload.actor.name }
        : null);

    if (!currentUser?.id) {
      return NextResponse.json(
        {
          error: "USER_CONTEXT_REQUIRED",
          message: "缺少用户身份信息，无法更换审批人。",
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

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "CONFLICT", message: "该审批已处理，无法更换审批人" },
        { status: 409 },
      );
    }

    const actorId = String(currentUser.id);
    const isAssignedApprover =
      existing.approverId !== null && existing.approverId === actorId;
    const canReassign = isAdminUser(actorId) || isAssignedApprover || canApproveUser(actorId);
    if (!canReassign) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "只有管理员、当前审批人或具备审批权限的用户可以更换审批人。",
        },
        { status: 403 },
      );
    }

    const config = getActionConfig(approvalTypeToActionConfigId(existing.type));
    if (!config.allowOverride) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "当前审批配置不允许更换审批人。",
        },
        { status: 403 },
      );
    }
    const resolvedApprover = resolveApproverFromConfig(config, payload.approver);
    if (!resolvedApprover?.id) {
      return NextResponse.json(
        { error: "APPROVER_REQUIRED", message: "请先选择审批人再提交。" },
        { status: 400 },
      );
    }

    if (existing.approverId !== resolvedApprover.id && !payload.comment) {
      return NextResponse.json(
        {
          error: "COMMENT_REQUIRED",
          message: "更换审批人需要填写备注。",
        },
        { status: 400 },
      );
    }

    const updated = reassignApprovalApprover(id, {
      approver: resolvedApprover,
      actor: {
        id: actorId,
        name: currentUser.nickname,
      },
      comment: payload.comment,
    });

    const previousApproverLabel =
      existing.approverName ?? existing.approverId ?? undefined;
    const actorName = currentUser.nickname ?? actorId;
    const locale = request.headers.get("x-user-locale") ?? undefined;

    if (existing.approverId !== updated.approverId) {
      void (async () => {
        await reassignExternalApprovalTodo(updated, updated.externalTodoId);
        await notifyApprovalReassigned({
          request,
          approval: updated,
          locale,
          actorName,
          previousApproverLabel,
          comment: payload.comment,
        });
      })();
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "无法更换审批人";
    const status = message.includes("不存在") ? 404 : message.includes("无法更换") ? 409 : 400;
    return NextResponse.json(
      { error: "APPROVER_REASSIGN_FAILED", message },
      { status },
    );
  }
}

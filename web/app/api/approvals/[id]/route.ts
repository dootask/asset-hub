import { NextRequest, NextResponse } from "next/server";
import {
  getApprovalRequestById,
  isApprovalCcRecipient,
} from "@/lib/repositories/approvals";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = extractUserFromRequest(request);
  const currentUserId = user?.id ? String(user.id) : "";
  if (!currentUserId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "缺少用户信息，请重新登录后再试。" },
      { status: 401 },
    );
  }
  const approval = getApprovalRequestById(id);

  if (!approval) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "审批请求不存在" },
      { status: 404 },
    );
  }

  if (!isAdminUser(currentUserId)) {
    const canRead =
      approval.applicantId === currentUserId ||
      approval.approverId === currentUserId ||
      isApprovalCcRecipient(approval.id, currentUserId);
    if (!canRead) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "当前用户无权查看该审批。" },
        { status: 403 },
      );
    }
  }

  return NextResponse.json({ data: approval });
}

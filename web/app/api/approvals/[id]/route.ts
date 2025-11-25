import { NextRequest, NextResponse } from "next/server";
import { getApprovalRequestById } from "@/lib/repositories/approvals";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const approval = getApprovalRequestById(id);

  if (!approval) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "审批请求不存在" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: approval });
}


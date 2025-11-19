import { NextResponse } from "next/server";
import { getApprovalRequestById } from "@/lib/repositories/approvals";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_: Request, { params }: RouteParams) {
  const approval = getApprovalRequestById(params.id);

  if (!approval) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "审批请求不存在" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: approval });
}



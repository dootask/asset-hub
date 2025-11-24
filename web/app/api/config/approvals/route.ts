import { NextResponse } from "next/server";
import { listActionConfigs } from "@/lib/repositories/action-configs";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

export async function GET(request: Request) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以查看审批配置。" },
      { status: 403 },
    );
  }
  const configs = listActionConfigs();
  return NextResponse.json({ data: configs });
}

import { NextResponse } from "next/server";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

const DEFAULT_FORBIDDEN_MESSAGE = "只有系统管理员可以访问该接口。";

export function ensureAdminApiAccess(
  request: Request,
  message: string = DEFAULT_FORBIDDEN_MESSAGE,
) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message,
      },
      { status: 403 },
    );
  }
  return null;
}



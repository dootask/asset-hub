import { NextResponse } from "next/server";
import { restoreBackup } from "@/lib/repositories/backups";
import { isAdminUser } from "@/lib/utils/permissions";
import { extractUserFromRequest } from "@/lib/utils/request-user";

function ensureAdmin(request: Request) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以还原数据库。" },
      { status: 403 },
    );
  }
  return user;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = ensureAdmin(request);
  if (user instanceof NextResponse) {
    return user;
  }
  const { id } = params;
  if (!id) {
    return NextResponse.json(
      { error: "INVALID_ID", message: "缺少备份标识。" },
      { status: 400 },
    );
  }

  try {
    restoreBackup(id, { actor: user?.id });
    return NextResponse.json({ data: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "RESTORE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "还原失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}

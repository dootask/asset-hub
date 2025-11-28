import { NextResponse } from "next/server";
import { deleteBackup } from "@/lib/repositories/backups";
import { isAdminUser } from "@/lib/utils/permissions";
import { extractUserFromRequest } from "@/lib/utils/request-user";

function ensureAdmin(request: Request) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以管理数据库备份。" },
      { status: 403 },
    );
  }
  return null;
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const forbidden = ensureAdmin(request);
  if (forbidden) return forbidden;
  const { id } = params;
  if (!id) {
    return NextResponse.json(
      { error: "INVALID_ID", message: "缺少备份标识。" },
      { status: 400 },
    );
  }

  try {
    deleteBackup(id);
    return NextResponse.json({ data: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "DELETE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "删除备份失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}

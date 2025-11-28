import { NextResponse } from "next/server";
import { createBackup, listBackups } from "@/lib/repositories/backups";
import type { CreateBackupPayload } from "@/lib/types/backup";
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

function sanitizePayload(payload: Partial<CreateBackupPayload>): CreateBackupPayload {
  const note =
    typeof payload.note === "string"
      ? payload.note.trim().slice(0, 200)
      : undefined;
  return { note };
}

export async function GET(request: Request) {
  const forbidden = ensureAdmin(request);
  if (forbidden) return forbidden;
  const backups = listBackups();
  return NextResponse.json({ data: backups });
}

export async function POST(request: Request) {
  const forbidden = ensureAdmin(request);
  if (forbidden) return forbidden;

  const user = extractUserFromRequest(request);
  try {
    const payload = sanitizePayload(await request.json());
    const backup = createBackup({ note: payload.note, createdBy: user?.id });
    return NextResponse.json({ data: backup }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "BACKUP_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "备份失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}

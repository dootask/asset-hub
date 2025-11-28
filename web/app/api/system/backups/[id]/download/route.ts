import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getBackupFileStream } from "@/lib/repositories/backups";
import { isAdminUser } from "@/lib/utils/permissions";
import { extractUserFromRequest } from "@/lib/utils/request-user";

function ensureAdmin(request: Request) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以下载备份。" },
      { status: 403 },
    );
  }
  return null;
}

function sanitizeFilename(id: string) {
  const base = id.endsWith(".db") ? id : `${id}.db`;
  return base.replace(/[^\w.\-]/g, "_");
}

export async function GET(
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
    const stream = getBackupFileStream(id);
    const readable = Readable.toWeb(stream) as unknown as ReadableStream;
    const filename = sanitizeFilename(id);
    return new NextResponse(readable, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "DOWNLOAD_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "下载失败，请稍后重试。",
      },
      { status: 404 },
    );
  }
}

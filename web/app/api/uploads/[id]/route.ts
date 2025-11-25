import { NextResponse } from "next/server";
import { getUploadRecord, readUploadedFile } from "@/lib/uploads";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const record = await getUploadRecord(id);

  if (!record) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "文件不存在或已被删除。" },
      { status: 404 },
    );
  }

  const file = await readUploadedFile(record.id);
  if (!file) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "文件不存在或已被删除。" },
      { status: 404 },
    );
  }

  return new NextResponse(file, {
    status: 200,
    headers: {
      "Content-Type": record.mimeType ?? "application/octet-stream",
      "Content-Length": record.size.toString(),
      "Content-Disposition": `inline; filename="${encodeURIComponent(record.name)}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";


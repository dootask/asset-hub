import { NextResponse } from "next/server";
import { restoreAsset } from "@/lib/repositories/assets";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以恢复资产。" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const restored = restoreAsset(id, user!.id);
  if (!restored) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "资产不存在或未被删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: restored });
}

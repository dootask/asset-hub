import { NextResponse } from "next/server";
import { permanentlyDeleteConsumable } from "@/lib/repositories/consumables";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以永久删除耗材。" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const removed = permanentlyDeleteConsumable(id);
  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "耗材不存在或未被删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { success: true } });
}

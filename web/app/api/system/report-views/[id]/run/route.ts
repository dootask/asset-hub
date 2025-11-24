import { NextResponse } from "next/server";
import { getReportViewById } from "@/lib/repositories/report-views";
import { runReportView } from "@/lib/services/report-runner";
import { ensureAdminApiAccess } from "@/lib/server/api-guards";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const forbidden = ensureAdminApiAccess(
    request,
    "只有系统管理员可以运行自定义报表。",
  );
  if (forbidden) {
    return forbidden;
  }
  const { id } = await params;
  const view = getReportViewById(id);
  if (!view) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "报表视图不存在。" },
      { status: 404 },
    );
  }
  const result = runReportView(view);
  return NextResponse.json({ data: result });
}


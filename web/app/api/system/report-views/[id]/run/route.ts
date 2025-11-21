import { NextResponse } from "next/server";
import { getReportViewById } from "@/lib/repositories/report-views";
import { runReportView } from "@/lib/services/report-runner";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
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


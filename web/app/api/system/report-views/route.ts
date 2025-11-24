import { NextResponse } from "next/server";
import {
  createReportView,
  listReportViews,
} from "@/lib/repositories/report-views";
import type { CreateReportViewPayload } from "@/lib/types/report";
import { ensureAdminApiAccess } from "@/lib/server/api-guards";

const DATA_SOURCES = new Set(["assets", "approvals"]);

function sanitizePayload(payload: unknown): CreateReportViewPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Payload must be an object");
  }
  const { name, dataSource, fields, filters } = payload as Record<
    string,
    unknown
  >;
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("报表名称不能为空");
  }
  if (typeof dataSource !== "string" || !DATA_SOURCES.has(dataSource)) {
    throw new Error("数据源不合法");
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error("至少选择一个字段");
  }
  return {
    name: name.trim(),
    dataSource: dataSource as CreateReportViewPayload["dataSource"],
    fields: fields
      .map((field) => (typeof field === "string" ? field.trim() : ""))
      .filter(Boolean),
    filters:
      filters && typeof filters === "object"
        ? (filters as Record<string, unknown>)
        : undefined,
  };
}

export async function GET(request: Request) {
  const forbidden = ensureAdminApiAccess(
    request,
    "只有系统管理员可以查看自定义报表。",
  );
  if (forbidden) {
    return forbidden;
  }
  const views = listReportViews();
  return NextResponse.json({ data: views });
}

export async function POST(request: Request) {
  const forbidden = ensureAdminApiAccess(
    request,
    "只有系统管理员可以创建或编辑自定义报表。",
  );
  if (forbidden) {
    return forbidden;
  }
  try {
    const body = await request.json();
    const payload = sanitizePayload(body);
    const view = createReportView(payload);
    return NextResponse.json({ data: view }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REPORT_VIEW",
        message:
          error instanceof Error ? error.message : "保存报表失败，请稍后重试。",
      },
      { status: 400 },
    );
  }
}


import { NextResponse } from "next/server";
import {
  deleteReportView,
  getReportViewById,
  updateReportView,
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteContext) {
  const forbidden = ensureAdminApiAccess(
    request,
    "只有系统管理员可以更新自定义报表。",
  );
  if (forbidden) {
    return forbidden;
  }
  try {
    const { id } = await params;
    const payload = sanitizePayload(await request.json());
    const updated = updateReportView(id, payload);
    if (!updated) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: "报表视图不存在。",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const forbidden = ensureAdminApiAccess(
    request,
    "只有系统管理员可以删除自定义报表。",
  );
  if (forbidden) {
    return forbidden;
  }
  const { id } = await params;
  const existing = getReportViewById(id);
  if (!existing) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "报表视图不存在。" },
      { status: 404 },
    );
  }
  const removed = deleteReportView(id);
  if (!removed) {
    return NextResponse.json(
      { error: "DELETE_FAILED", message: "删除失败，请稍后重试。" },
      { status: 400 },
    );
  }
  return NextResponse.json({ data: { success: true } });
}


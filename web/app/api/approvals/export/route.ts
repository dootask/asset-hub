import { NextResponse } from "next/server";
import type { ApprovalStatus, ApprovalType } from "@/lib/types/approval";
import {
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
} from "@/lib/types/approval";
import { listApprovalRequests } from "@/lib/repositories/approvals";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import type {
  OperationTemplateFieldValue,
  OperationTemplateFieldWidget,
} from "@/lib/types/operation-template";

function parseListParam<T extends string>(
  value: string | null,
  allowList: readonly T[],
): T[] | undefined {
  if (!value) return undefined;
  const tokens = value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => allowList.includes(token as T));
  return tokens.length ? (tokens as T[]) : undefined;
}

function toCsv(rows: Record<string, string>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const data = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    ),
  ];
  return data.join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = parseListParam<ApprovalStatus>(
    searchParams.get("status"),
    APPROVAL_STATUSES.map((item) => item.value),
  );
  const type = parseListParam<ApprovalType>(
    searchParams.get("type"),
    APPROVAL_TYPES.map((item) => item.value),
  );

  const role = searchParams.get("role");
  const userId = searchParams.get("userId") ?? undefined;

  const result = listApprovalRequests({
    status,
    type,
    applicantId: searchParams.get("applicantId") ?? undefined,
    approverId: searchParams.get("approverId") ?? undefined,
    assetId: searchParams.get("assetId") ?? undefined,
    operationId: searchParams.get("operationId") ?? undefined,
    userId,
    role: role === "my-requests" || role === "my-tasks" ? role : undefined,
    page: 1,
    pageSize: 1000,
  });

  if (result.data.length === 0) {
    return NextResponse.json(
      { error: "NO_DATA", message: "没有可导出的审批记录。" },
      { status: 404 },
    );
  }

  const templateFieldMap = new Map<
    string,
    { widget?: OperationTemplateFieldWidget }
  >();

  result.data.forEach((approval) => {
    const metadata = extractOperationTemplateMetadata(approval.metadata ?? undefined);
    if (!metadata) {
      return;
    }
    metadata.snapshot?.fields.forEach((field) => {
      if (!templateFieldMap.has(field.key)) {
        templateFieldMap.set(field.key, { widget: field.widget });
      }
    });
    Object.keys(metadata.values ?? {}).forEach((key) => {
      if (!templateFieldMap.has(key)) {
        templateFieldMap.set(key, { widget: undefined });
      }
    });
  });

  const templateColumns = Array.from(templateFieldMap.keys()).sort();

  const rows = result.data.map((approval) => {
    const metadata = extractOperationTemplateMetadata(approval.metadata ?? undefined);
    const templateValues = metadata?.values ?? {};
    const templateFields = templateColumns.reduce<Record<string, string>>(
      (acc, key) => {
        acc[`operation_${key}`] = formatTemplateFieldValue(
          templateValues[key] as OperationTemplateFieldValue | undefined,
          templateFieldMap.get(key)?.widget,
        );
        return acc;
      },
      {},
    );
    return {
      id: approval.id,
      title: approval.title,
      type: approval.type,
      status: approval.status,
      applicant: approval.applicantName ?? approval.applicantId ?? "",
      approver: approval.approverName ?? approval.approverId ?? "",
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
      result: approval.result ?? "",
      ...templateFields,
    };
  });

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="approvals-export.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function formatTemplateFieldValue(
  value: OperationTemplateFieldValue | undefined,
  widget?: OperationTemplateFieldWidget,
): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join(" | ");
  }
  if (widget === "number" && typeof value === "number") {
    return value.toString();
  }
  return typeof value === "string" ? value : String(value);
}



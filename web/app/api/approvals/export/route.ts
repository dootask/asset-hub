import { NextResponse } from "next/server";
import type { ApprovalStatus, ApprovalType } from "@/lib/types/approval";
import {
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
} from "@/lib/types/approval";
import { listApprovalRequests } from "@/lib/repositories/approvals";

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

  const rows = result.data.map((approval) => ({
    id: approval.id,
    title: approval.title,
    type: approval.type,
    status: approval.status,
    applicant: approval.applicantName ?? approval.applicantId ?? "",
    approver: approval.approverName ?? approval.approverId ?? "",
    createdAt: approval.createdAt,
    updatedAt: approval.updatedAt,
    result: approval.result ?? "",
  }));

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="approvals-export.csv"`,
      "Cache-Control": "no-store",
    },
  });
}



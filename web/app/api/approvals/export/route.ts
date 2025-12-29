import { NextResponse } from "next/server";
import type { ApprovalStatus, ApprovalType } from "@/lib/types/approval";
import {
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
} from "@/lib/types/approval";
import { listApprovalRequests } from "@/lib/repositories/approvals";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";
import { buildWorkbookBufferFromRecords } from "@/lib/utils/xlsx";
import {
  createDooTaskClientFromContext,
  resolveServerFromRequest,
} from "@/lib/integrations/dootask-server-client";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = (searchParams.get("lang") ?? "en").toLowerCase();
  const isChinese = lang === "zh";
  const user = extractUserFromRequest(request);
  let currentUserId = user?.id ? String(user.id) : undefined;
  let userToken = user?.token ?? undefined;
  if (!userToken) {
    userToken = searchParams.get("token") ?? undefined;
  }
  if (!currentUserId && userToken) {
    const client = createDooTaskClientFromContext({
      token: userToken,
      serverOrigin: resolveServerFromRequest(request),
    });
    if (client) {
      try {
        const info = await client.getUserInfo();
        currentUserId = info?.userid ? String(info.userid) : undefined;
      } catch (error) {
        console.warn("Failed to resolve user info from token for approvals export:", error);
      }
    }
  }
  if (!currentUserId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "缺少用户信息，请重新登录后再试。" },
      { status: 401 },
    );
  }
  const isAdmin = isAdminUser(currentUserId);

  const status = parseListParam<ApprovalStatus>(
    searchParams.get("status"),
    APPROVAL_STATUSES.map((item) => item.value),
  );
  const type = parseListParam<ApprovalType>(
    searchParams.get("type"),
    APPROVAL_TYPES.map((item) => item.value),
  );

  let role = searchParams.get("role");
  let userId = searchParams.get("userId") ?? undefined;
  if (!isAdmin) {
    userId = currentUserId;
    if (!role || (role !== "my-requests" && role !== "my-tasks" && role !== "all")) {
      role = "all";
    }
  }

  const result = listApprovalRequests({
    status,
    type,
    applicantId: searchParams.get("applicantId") ?? undefined,
    approverId: searchParams.get("approverId") ?? undefined,
    assetId: searchParams.get("assetId") ?? undefined,
    operationId: searchParams.get("operationId") ?? undefined,
    userId,
    role: role === "all" || role === "my-requests" || role === "my-tasks" ? role : undefined,
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
    { widget?: OperationTemplateFieldWidget; labelZh?: string; labelEn?: string }
  >();

  result.data.forEach((approval) => {
    const metadata = extractOperationTemplateMetadata(approval.metadata ?? undefined);
    if (!metadata) {
      return;
    }
    metadata.snapshot?.fields.forEach((field) => {
      if (!templateFieldMap.has(field.key)) {
        templateFieldMap.set(field.key, {
          widget: field.widget,
          labelZh: field.labelZh,
          labelEn: field.labelEn,
        });
      }
    });
    Object.keys(metadata.values ?? {}).forEach((key) => {
      if (!templateFieldMap.has(key)) {
        templateFieldMap.set(key, { widget: undefined, labelZh: key, labelEn: key });
      }
    });
  });

  const templateColumns = Array.from(templateFieldMap.keys()).sort();

  const baseHeaders = isChinese
    ? [
        "审批ID",
        "标题",
        "类型",
        "状态",
        "申请人",
        "审批人",
        "创建时间",
        "更新时间",
        "结果",
      ]
    : [
        "id",
        "title",
        "type",
        "status",
        "applicant",
        "approver",
        "createdAt",
        "updatedAt",
        "result",
      ];
  const usedHeaders = new Set(baseHeaders);
  const templateHeaderMap = new Map<string, string>();
  templateColumns.forEach((key) => {
    const field = templateFieldMap.get(key);
    const rawLabel = isChinese ? field?.labelZh : field?.labelEn;
    let label = rawLabel?.trim() || key;
    if (!isChinese) {
      label = `operation_${key}`;
    }
    if (usedHeaders.has(label)) {
      label = `${label} (${key})`;
    }
    let suffix = 1;
    while (usedHeaders.has(label)) {
      label = `${label} (${suffix})`;
      suffix += 1;
    }
    usedHeaders.add(label);
    templateHeaderMap.set(key, label);
  });
  const headers = [...baseHeaders, ...Array.from(templateHeaderMap.values())];

  const rows = result.data.map((approval) => {
    const metadata = extractOperationTemplateMetadata(approval.metadata ?? undefined);
    const templateValues = metadata?.values ?? {};
    const templateFields = templateColumns.reduce<Record<string, string>>(
      (acc, key) => {
        const header = templateHeaderMap.get(key) ?? key;
        acc[header] = formatTemplateFieldValue(
          templateValues[key] as OperationTemplateFieldValue | undefined,
          templateFieldMap.get(key)?.widget,
        );
        return acc;
      },
      {},
    );
    return isChinese
      ? {
          审批ID: approval.id,
          标题: approval.title,
          类型: approval.type,
          状态: approval.status,
          申请人: approval.applicantName ?? approval.applicantId ?? "",
          审批人: approval.approverName ?? approval.approverId ?? "",
          创建时间: approval.createdAt,
          更新时间: approval.updatedAt,
          结果: approval.result ?? "",
          ...templateFields,
        }
      : {
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

  const buffer = buildWorkbookBufferFromRecords(
    isChinese ? "审批导出" : "Approvals",
    rows,
    headers,
  );
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="approvals-export.xlsx"`,
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

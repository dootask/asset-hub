import { NextResponse } from "next/server";
import {
  type ApprovalStatus,
  type ApprovalType,
  type CreateApprovalRequestPayload,
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
} from "@/lib/types/approval";
import {
  createApprovalRequest,
  listApprovalRequests,
} from "@/lib/repositories/approvals";
import { getRequestBaseUrl } from "@/lib/utils/server-url";
import {
  notifyApprovalCreated,
} from "@/lib/integrations/dootask-notifications";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { getActionConfig } from "@/lib/repositories/action-configs";
import type { ActionConfig } from "@/lib/types/action-config";
import { approvalTypeToActionConfigId } from "@/lib/utils/action-config";

const STATUS_ALLOW_LIST = APPROVAL_STATUSES.map((item) => item.value);
const TYPE_ALLOW_LIST = APPROVAL_TYPES.map((item) => item.value);

function parseListParam<T extends string>(
  raw: string | null,
  allowList: readonly T[],
): T[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as T[];

  const valid = values.filter((value) =>
    allowList.includes(value as T & (typeof allowList)[number]),
  );

  return valid.length ? valid : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = parseListParam<ApprovalStatus>(
    searchParams.get("status"),
    STATUS_ALLOW_LIST,
  );
  const typeParam = parseListParam<ApprovalType>(
    searchParams.get("type"),
    TYPE_ALLOW_LIST,
  );

  const role = searchParams.get("role");
  const userId = searchParams.get("userId") ?? undefined;

  const page = Number(searchParams.get("page"));
  const pageSize = Number(searchParams.get("pageSize"));

  const result = listApprovalRequests({
    status: statusParam,
    type: typeParam,
    applicantId: searchParams.get("applicantId") ?? undefined,
    approverId: searchParams.get("approverId") ?? undefined,
    assetId: searchParams.get("assetId") ?? undefined,
    operationId: searchParams.get("operationId") ?? undefined,
    userId,
    role: role === "my-requests" || role === "my-tasks" ? role : undefined,
    page: Number.isNaN(page) ? undefined : page,
    pageSize: Number.isNaN(pageSize) ? undefined : pageSize,
  });

  return NextResponse.json(result);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeCreatePayload(
  payload: unknown,
): CreateApprovalRequestPayload {
  if (!isRecord(payload)) {
    throw new Error("请求体必须是 JSON 对象");
  }

  const type = payload.type;
  if (typeof type !== "string" || !TYPE_ALLOW_LIST.includes(type)) {
    throw new Error("审批类型不合法");
  }

  const title = payload.title;
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("缺少审批标题");
  }

  const applicant = payload.applicant;
  if (!isRecord(applicant) || typeof applicant.id !== "string") {
    throw new Error("缺少申请人信息");
  }

  const cleaned: CreateApprovalRequestPayload = {
    type,
    title: title.trim(),
    applicant: {
      id: applicant.id,
      name: typeof applicant.name === "string" ? applicant.name : undefined,
    },
  };

  if (typeof payload.reason === "string") {
    cleaned.reason = payload.reason;
  }

  if (typeof payload.assetId === "string") {
    cleaned.assetId = payload.assetId;
  }

  if (typeof payload.operationId === "string") {
    cleaned.operationId = payload.operationId;
  }

  if (isRecord(payload.approver)) {
    cleaned.approver = {
      id:
        typeof payload.approver.id === "string"
          ? payload.approver.id
          : undefined,
      name:
        typeof payload.approver.name === "string"
          ? payload.approver.name
          : undefined,
    };
  }

  if (payload.metadata && isRecord(payload.metadata)) {
    cleaned.metadata = payload.metadata;
  }

  return cleaned;
}

function resolveApproverFromConfig(
  config: ActionConfig,
  requested?: { id?: string; name?: string },
) {
  const cleanedRequested =
    requested?.id && typeof requested.id === "string"
      ? {
          id: requested.id.trim(),
          name:
            typeof requested.name === "string" && requested.name.trim().length > 0
              ? requested.name.trim()
              : undefined,
        }
      : undefined;

  const defaultUserId =
    config.defaultApproverType === "user" && config.defaultApproverRefs.length > 0
      ? config.defaultApproverRefs[0]
      : null;

  if (!config.allowOverride) {
    if (defaultUserId) {
      return { id: defaultUserId, name: cleanedRequested?.name };
    }
    throw new Error(
      config.defaultApproverType === "role"
        ? "审批配置使用角色指派但未启用修改，目前暂不支持自动分配角色成员。请联系管理员调整配置。"
        : "审批配置未设置默认审批人且禁止修改，请联系管理员设置默认审批人。",
    );
  }

  if (cleanedRequested?.id) {
    return cleanedRequested;
  }

  if (defaultUserId) {
    return { id: defaultUserId };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const payload = sanitizeCreatePayload(rawBody);
    const requestUser =
      extractUserFromRequest(request) ?? payload.applicant ?? null;

    if (!requestUser?.id) {
      return NextResponse.json(
        {
          error: "USER_CONTEXT_REQUIRED",
          message:
            "缺少用户身份信息，请通过 DooTask 菜单或附带 user_id 参数访问。",
        },
        { status: 401 },
      );
    }

    const config = getActionConfig(approvalTypeToActionConfigId(payload.type));
    if (!config.requiresApproval) {
      return NextResponse.json(
        {
          error: "APPROVAL_DISABLED",
          message: "该类型当前无需审批，如需启用请联系管理员调整配置。",
        },
        { status: 400 },
      );
    }

    let resolvedApprover: { id: string; name?: string } | null = null;
    try {
      resolvedApprover = resolveApproverFromConfig(config, payload.approver);
    } catch (configError) {
      return NextResponse.json(
        {
          error: "CONFIG_ERROR",
          message:
            configError instanceof Error
              ? configError.message
              : "审批配置存在问题，请联系管理员。",
        },
        { status: 400 },
      );
    }

    if (!resolvedApprover?.id) {
      return NextResponse.json(
        {
          error: "APPROVER_REQUIRED",
          message: "请先选择审批人再提交请求。",
        },
        { status: 400 },
      );
    }

    const metadataWithConfig = {
      ...(payload.metadata ?? {}),
      configSnapshot: {
        id: config.id,
        requiresApproval: config.requiresApproval,
        defaultApproverType: config.defaultApproverType,
        allowOverride: config.allowOverride,
      },
    };

    const safePayload: CreateApprovalRequestPayload = {
      ...payload,
      applicant: {
        id: requestUser.id,
        name: requestUser.nickname ?? payload.applicant?.name,
      },
      approver: resolvedApprover,
      metadata: metadataWithConfig,
    };
    const approval = createApprovalRequest(safePayload);

    const url = new URL(request.url);
    const localeParam = url.searchParams.get("lang");
    const locale = localeParam && /zh/i.test(localeParam) ? "zh" : "en";
    const hostParams = new URLSearchParams();
    const forwardKeys = [
      "theme",
      "lang",
      "system_lang",
      "system_theme",
      "user_id",
      "user_token",
      "user_nickname",
      "user_email",
    ];
    forwardKeys.forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) {
        hostParams.set(key, value);
      }
    });
    const query = hostParams.toString();
    const baseUrl = await getRequestBaseUrl();
    const detailLink = `${baseUrl}/apps/asset-hub/${locale}/approvals/${approval.id}${
      query ? `?${query}` : ""
    }`;

    await notifyApprovalCreated({
      approval,
      detailLink,
    });

    return NextResponse.json({ data: approval }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: error instanceof Error ? error.message : "请求参数不合法",
      },
      { status: 400 },
    );
  }
}



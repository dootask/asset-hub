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
  setApprovalExternalTodo,
} from "@/lib/repositories/approvals";
import {
  extractUserFromRequest,
  type RequestUser,
} from "@/lib/utils/request-user";
import { getActionConfig } from "@/lib/repositories/action-configs";
import { approvalTypeToActionConfigId } from "@/lib/utils/action-config";
import { createExternalApprovalTodo } from "@/lib/integrations/dootask-todos";
import { notifyApprovalCreated } from "@/lib/services/approval-notifications";
import { isAdminUser } from "@/lib/utils/permissions";
import { resolveApproverFromConfig } from "@/lib/services/approval-approver";
import { getAssetById } from "@/lib/repositories/assets";

const STATUS_ALLOW_LIST = APPROVAL_STATUSES.map((item) => item.value);
const TYPE_ALLOW_LIST = APPROVAL_TYPES.map((item) => item.value);

function isApprovalType(value: unknown): value is ApprovalType {
  return (
    typeof value === "string" &&
    TYPE_ALLOW_LIST.includes(value as ApprovalType)
  );
}

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
  const user = extractUserFromRequest(request);
  const currentUserId = user?.id ? String(user.id) : undefined;
  if (!currentUserId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "缺少用户信息，请重新登录后再试。" },
      { status: 401 },
    );
  }
  const isAdmin = isAdminUser(currentUserId);

  const statusParam = parseListParam<ApprovalStatus>(
    searchParams.get("status"),
    STATUS_ALLOW_LIST,
  );
  const typeParam = parseListParam<ApprovalType>(
    searchParams.get("type"),
    TYPE_ALLOW_LIST,
  );

  // Security: Enforce user context for non-admins
  let role = searchParams.get("role");
  let userId = searchParams.get("userId") ?? undefined;

  if (!isAdmin) {
    // For non-admins, we ignore the passed userId and enforce the current session user
    userId = currentUserId;

    // If no specific view role is requested, default to "all" within current user scope.
    // This ensures the "All" tab equals "my-requests + my-tasks" for non-admins.
    if (!role || (role !== "my-requests" && role !== "my-tasks" && role !== "all")) {
      role = "all";
    }
  }

  const page = Number(searchParams.get("page"));
  const pageSize = Number(searchParams.get("pageSize"));

  const result = listApprovalRequests({
    status: statusParam,
    type: typeParam,
    applicantId: searchParams.get("applicantId") ?? undefined,
    approverId: searchParams.get("approverId") ?? undefined,
    assetId: searchParams.get("assetId") ?? undefined,
    consumableId: searchParams.get("consumableId") ?? undefined,
    operationId: searchParams.get("operationId") ?? undefined,
    consumableOperationId:
      searchParams.get("consumableOperationId") ?? undefined,
    userId,
    role: role === "all" || role === "my-requests" || role === "my-tasks" ? role : undefined,
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
  if (!isApprovalType(type)) {
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

  if (typeof payload.consumableId === "string") {
    cleaned.consumableId = payload.consumableId;
  }

  if (typeof payload.consumableOperationId === "string") {
    cleaned.consumableOperationId = payload.consumableOperationId;
  }

  if (payload.metadata && isRecord(payload.metadata)) {
    cleaned.metadata = payload.metadata;
  }

  if (cleaned.assetId && cleaned.consumableId) {
    throw new Error("审批请求不能同时关联资产与耗材");
  }

  if (cleaned.operationId && !cleaned.assetId) {
    throw new Error("资产操作审批必须提供资产 ID");
  }

  if (cleaned.type === "purchase" && !cleaned.assetId) {
    const newAssetMeta = cleaned.metadata?.newAsset;
    const newAssetName = isRecord(newAssetMeta)
      ? (newAssetMeta.name as unknown)
      : undefined;
    const newAssetCategory = isRecord(newAssetMeta)
      ? (newAssetMeta.category as unknown)
      : undefined;

    if (
      typeof newAssetName !== "string" ||
      !newAssetName.trim() ||
      typeof newAssetCategory !== "string" ||
      !newAssetCategory.trim()
    ) {
      throw new Error("新资产采购必须提供资产名称和类别");
    }
  }

  if (cleaned.type === "purchase") {
    const purchaseAsset = (cleaned.metadata as { purchaseAsset?: unknown })
      ?.purchaseAsset;
    if (typeof purchaseAsset === "object" && purchaseAsset !== null) {
      const mode = (purchaseAsset as { mode?: unknown }).mode;
      if (mode === "existing" && !cleaned.assetId) {
        throw new Error("关联已有资产时必须提供资产 ID");
      }
    }

    if (cleaned.assetId) {
      const asset = getAssetById(cleaned.assetId);
      if (!asset) {
        throw new Error("关联的资产不存在");
      }
    }
  }

  if (cleaned.consumableOperationId && !cleaned.consumableId) {
    throw new Error("耗材操作审批必须提供耗材 ID");
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

  return cleaned;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const payload = sanitizeCreatePayload(rawBody);
    const fallbackRequestUser: RequestUser = {
      id: payload.applicant.id,
      nickname: payload.applicant.name,
    };
    const requestUser =
      extractUserFromRequest(request) ?? fallbackRequestUser;

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

    const metadataWithConfig: Record<string, unknown> = {
      ...(payload.metadata ?? {}),
      configSnapshot: {
        id: config.id,
        requiresApproval: config.requiresApproval,
        defaultApproverType: config.defaultApproverType,
        allowOverride: config.allowOverride,
      },
    };

    if (!("scope" in metadataWithConfig)) {
      metadataWithConfig.scope = payload.consumableId ? "consumable" : "asset";
    }

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
    const locale = request.headers.get("x-user-locale") ?? undefined;

    void (async () => {
      const externalId = await createExternalApprovalTodo(approval);
      if (externalId) {
        setApprovalExternalTodo(approval.id, externalId);
      }
      await notifyApprovalCreated({
        request,
        approval,
        locale,
      });
    })();

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

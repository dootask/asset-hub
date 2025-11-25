import { NextRequest, NextResponse } from "next/server";
import {
  ActionConfigId,
  ActionConfigInput,
  ApproverType,
} from "@/lib/types/action-config";
import { getActionConfig, upsertActionConfig } from "@/lib/repositories/action-configs";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

const ACTION_CONFIG_IDS: ActionConfigId[] = [
  "purchase",
  "inbound",
  "receive",
  "borrow",
  "return",
  "maintenance",
  "dispose",
  "outbound",
  "reserve",
  "release",
  "adjust",
  "other",
];

function isActionConfigId(value: string): value is ActionConfigId {
  return ACTION_CONFIG_IDS.includes(value as ActionConfigId);
}

function isApproverType(value: unknown): value is ApproverType {
  return value === "none" || value === "user" || value === "role";
}

function sanitizePayload(payload: unknown): ActionConfigInput {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Payload must be an object");
  }

  const requiresApproval = Boolean((payload as Record<string, unknown>).requiresApproval);
  const defaultApproverType = (payload as Record<string, unknown>).defaultApproverType;
  const allowOverride = Boolean((payload as Record<string, unknown>).allowOverride ?? true);
  const defaultApproverRefs = (payload as Record<string, unknown>).defaultApproverRefs;
  const metadata = (payload as Record<string, unknown>).metadata;

  if (!isApproverType(defaultApproverType)) {
    throw new Error("Invalid defaultApproverType");
  }

  let approverRefs: string[] = [];
  if (Array.isArray(defaultApproverRefs)) {
    approverRefs = defaultApproverRefs
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  }

  const cleanedMetadata =
    metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : null;

  return {
    requiresApproval,
    defaultApproverType,
    defaultApproverRefs: approverRefs,
    allowOverride,
    metadata: cleanedMetadata,
  };
}

function ensureAdmin(request: Request) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以管理审批配置。" },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const forbidden = ensureAdmin(request);
  if (forbidden) {
    return forbidden;
  }
  const { id } = await context.params;
  if (!isActionConfigId(id)) {
    return NextResponse.json(
      { error: "INVALID_CONFIG", message: "审批配置不存在。" },
      { status: 404 },
    );
  }
  const config = getActionConfig(id);
  return NextResponse.json({ data: config });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const forbidden = ensureAdmin(request);
  if (forbidden) {
    return forbidden;
  }
  try {
    const { id } = await context.params;
    if (!isActionConfigId(id)) {
      return NextResponse.json(
        { error: "INVALID_CONFIG", message: "审批配置不存在。" },
        { status: 404 },
      );
    }
    const payload = sanitizePayload(await request.json());
    const updated = upsertActionConfig(id, payload);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_CONFIG",
        message: error instanceof Error ? error.message : "无效的审批配置参数。",
      },
      { status: 400 },
    );
  }
}


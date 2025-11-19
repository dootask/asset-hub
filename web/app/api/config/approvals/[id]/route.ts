import { NextResponse } from "next/server";
import { ActionConfigId, ActionConfigInput, ApproverType } from "@/lib/types/action-config";
import { getActionConfig, upsertActionConfig } from "@/lib/repositories/action-configs";

interface RouteParams {
  params: Promise<{ id: ActionConfigId }>;
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

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const config = getActionConfig(id);
  return NextResponse.json({ data: config });
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
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



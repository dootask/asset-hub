import { NextResponse } from "next/server";
import {
  deleteRole,
  getRoleById,
  updateRole,
} from "@/lib/repositories/roles";
import type { CreateRolePayload } from "@/lib/types/system";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

function sanitizeMembers(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized = value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }
      if (typeof entry === "number" && Number.isFinite(entry)) {
        return String(entry);
      }
      return "";
    })
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function sanitizePayload(
  payload: Partial<CreateRolePayload>,
): CreateRolePayload {
  if (!payload.name || !payload.scope) {
    throw new Error("Role name and scope are required");
  }
  return {
    name: payload.name.trim(),
    scope: payload.scope.trim(),
    description: payload.description?.trim(),
    members: sanitizeMembers(payload.members),
  };
}

interface RouteParams {
  params: { id: string };
}

function ensureAdmin(request: Request) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "只有系统管理员可以管理角色。" },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const forbidden = ensureAdmin(request);
  if (forbidden) {
    return forbidden;
  }
  const role = getRoleById(params.id);
  if (!role) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "角色不存在" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: role });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const forbidden = ensureAdmin(request);
  if (forbidden) {
    return forbidden;
  }
  try {
    const payload = sanitizePayload(await request.json());
    const updated = updateRole(params.id, payload);
    if (!updated) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "角色不存在" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message:
          error instanceof Error ? error.message : "请求参数不合法。",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const forbidden = ensureAdmin(request);
  if (forbidden) {
    return forbidden;
  }
  const removed = deleteRole(params.id);
  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "角色不存在" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}


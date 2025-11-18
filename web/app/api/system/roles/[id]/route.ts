import { NextResponse } from "next/server";
import {
  deleteRole,
  getRoleById,
  updateRole,
} from "@/lib/repositories/roles";
import type { CreateRolePayload } from "@/lib/types/system";

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
  };
}

interface RouteParams {
  params: { id: string };
}

export async function GET(_: Request, { params }: RouteParams) {
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
  try {
    const payload = sanitizePayload(
      (await request.json()) as Partial<CreateRolePayload>,
    );
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

export async function DELETE(_: Request, { params }: RouteParams) {
  const removed = deleteRole(params.id);
  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "角色不存在" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}


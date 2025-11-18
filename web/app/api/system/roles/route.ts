import { NextResponse } from "next/server";
import { createRole, listRoles } from "@/lib/repositories/roles";
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

export async function GET() {
  return NextResponse.json({ data: listRoles() });
}

export async function POST(request: Request) {
  try {
    const payload = sanitizePayload(
      (await request.json()) as Partial<CreateRolePayload>,
    );
    const role = createRole(payload);
    return NextResponse.json({ data: role }, { status: 201 });
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


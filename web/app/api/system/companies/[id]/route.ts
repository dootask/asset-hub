import { NextResponse } from "next/server";
import {
  deleteCompany,
  getCompanyById,
  updateCompany,
} from "@/lib/repositories/companies";
import type { CreateCompanyPayload } from "@/lib/types/system";

function sanitizePayload(
  payload: Partial<CreateCompanyPayload>,
): CreateCompanyPayload {
  if (!payload.name || !payload.code) {
    throw new Error("Company name and code are required");
  }
  return {
    name: payload.name.trim(),
    code: payload.code.trim().toUpperCase(),
    description: payload.description?.trim(),
  };
}

interface RouteParams {
  params: { id: string };
}

export async function GET(_: Request, { params }: RouteParams) {
  const company = getCompanyById(params.id);
  if (!company) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "公司不存在" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: company });
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const payload = sanitizePayload(
      (await request.json()) as Partial<CreateCompanyPayload>,
    );
    const updated = updateCompany(params.id, payload);
    if (!updated) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "公司不存在" },
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
  const removed = deleteCompany(params.id);
  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "公司不存在" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}


import { NextResponse } from "next/server";
import {
  deleteCompany,
  getCompanyById,
  updateCompany,
} from "@/lib/repositories/companies";
import type { CreateCompanyPayload } from "@/lib/types/system";

function sanitizePayload(payload: unknown): CreateCompanyPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Payload must be an object");
  }
  const { name, code, description } = payload as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("公司名称不能为空");
  }
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("公司编码不能为空");
  }
  return {
    name: name.trim(),
    code: code.trim().toUpperCase(),
    description:
      typeof description === "string" && description.trim()
        ? description.trim()
        : undefined,
  };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = sanitizePayload(await request.json());
    const updated = updateCompany(id, payload);
    if (!updated) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: "公司不存在。",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新公司信息失败。";
    const status = message.includes("UNIQUE constraint failed") ? 409 : 400;
    return NextResponse.json(
      {
        error: "INVALID_COMPANY",
        message:
          status === 409
            ? "公司编码已存在，请使用其他编码。"
            : message,
      },
      { status },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const existing = getCompanyById(id);
  if (!existing) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "公司不存在。" },
      { status: 404 },
    );
  }
  const removed = deleteCompany(id);
  if (!removed) {
    return NextResponse.json(
      { error: "DELETE_FAILED", message: "删除公司失败。" },
      { status: 400 },
    );
  }
  return NextResponse.json({ data: { success: true } });
}
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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const company = getCompanyById(id);
  if (!company) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "公司不存在" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: company });
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const payload = sanitizePayload(
      (await request.json()) as Partial<CreateCompanyPayload>,
    );
    const { id } = await params;
    const updated = updateCompany(id, payload);
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

export async function DELETE(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const removed = deleteCompany(id);
  if (!removed) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "公司不存在" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}


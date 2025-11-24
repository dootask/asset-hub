import { NextResponse } from "next/server";
import {
  createCompany,
  listCompanies,
} from "@/lib/repositories/companies";
import type { CreateCompanyPayload } from "@/lib/types/system";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

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
  if (code.length > 32) {
    throw new Error("公司编码长度不能超过 32 个字符");
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

export async function GET() {
  const companies = listCompanies();
  return NextResponse.json({ data: companies });
}

export async function POST(request: Request) {
  const user = extractUserFromRequest(request);
  if (!isAdminUser(user?.id)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "只有系统管理员可以创建公司。",
      },
      { status: 403 },
    );
  }
  try {
    const body = await request.json();
    const payload = sanitizePayload(body);
    const company = createCompany(payload);
    return NextResponse.json({ data: company }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "创建公司失败，请稍后重试。";
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
import { NextResponse } from "next/server";
import {
  createCompany,
  listCompanies,
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

export async function GET() {
  return NextResponse.json({
    data: listCompanies(),
  });
}

export async function POST(request: Request) {
  try {
    const payload = sanitizePayload(
      (await request.json()) as Partial<CreateCompanyPayload>,
    );
    const company = createCompany(payload);
    return NextResponse.json({ data: company }, { status: 201 });
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


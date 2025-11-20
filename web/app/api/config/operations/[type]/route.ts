import { NextResponse } from "next/server";
import {
  getOperationTemplateByType,
  updateOperationTemplate,
} from "@/lib/repositories/operation-templates";
import type { OperationTemplateId } from "@/lib/types/operation-template";

function sanitizeType(value: string | undefined): OperationTemplateId {
  const allow: OperationTemplateId[] = [
    "purchase",
    "inbound",
    "receive",
    "borrow",
    "return",
    "maintenance",
    "dispose",
    "other",
  ];
  if (!value || !allow.includes(value as OperationTemplateId)) {
    throw new Error("INVALID_TYPE");
  }
  return value as OperationTemplateId;
}

export async function GET(
  _request: Request,
  { params }: { params: { type: string } },
) {
  try {
    const type = sanitizeType(params.type);
    const template = getOperationTemplateByType(type);
    if (!template) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "操作模板不存在。" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: template });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TYPE") {
      return NextResponse.json(
        { error: "INVALID_TYPE", message: "不支持的操作类型。" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "服务器内部错误" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: { params: { type: string } }) {
  try {
    const type = sanitizeType(params.type);
    const payload = await request.json();
    const template = updateOperationTemplate(type, {
      descriptionZh:
        typeof payload.descriptionZh === "string" ? payload.descriptionZh : undefined,
      descriptionEn:
        typeof payload.descriptionEn === "string" ? payload.descriptionEn : undefined,
      requireAttachment:
        payload.requireAttachment === undefined
          ? undefined
          : Boolean(payload.requireAttachment),
      metadata:
        payload.metadata && typeof payload.metadata === "object"
          ? payload.metadata
          : payload.metadata === null
            ? null
            : undefined,
    });
    return NextResponse.json({ data: template });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_TYPE") {
        return NextResponse.json(
          { error: "INVALID_TYPE", message: "不支持的操作类型。" },
          { status: 400 },
        );
      }
      if (error.message === "TEMPLATE_NOT_FOUND") {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "操作模板不存在。" },
          { status: 404 },
        );
      }
    }
    return NextResponse.json(
      { error: "UPDATE_FAILED", message: "更新模板失败，请稍后重试。" },
      { status: 500 },
    );
  }
}




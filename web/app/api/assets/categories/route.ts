import { NextResponse } from "next/server";
import {
  createAssetCategory,
  listAssetCategories,
} from "@/lib/repositories/asset-categories";

function formatError(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    switch (error.message) {
      case "CATEGORY_CODE_EXISTS":
        return { status: 400, message: "类别编码已存在，请更换后重试。" };
      case "CATEGORY_LABEL_REQUIRED":
        return { status: 400, message: "名称（中/英文）为必填项。" };
      default:
        return { status: 400, message: error.message };
    }
  }
  return { status: 500, message: "服务器内部错误" };
}

export async function GET() {
  const data = listAssetCategories();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const category = createAssetCategory({
      code: typeof payload.code === "string" ? payload.code : undefined,
      labelZh: typeof payload.labelZh === "string" ? payload.labelZh : "",
      labelEn: typeof payload.labelEn === "string" ? payload.labelEn : "",
      description:
        typeof payload.description === "string" ? payload.description : undefined,
      color: typeof payload.color === "string" ? payload.color : undefined,
    });
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    const formatted = formatError(error);
    return NextResponse.json(
      {
        error: "CATEGORY_CREATE_FAILED",
        message: formatted.message,
      },
      { status: formatted.status },
    );
  }
}



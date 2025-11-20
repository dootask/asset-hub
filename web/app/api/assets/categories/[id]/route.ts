import { NextResponse } from "next/server";
import {
  deleteAssetCategory,
  getAssetCategoryById,
  updateAssetCategory,
} from "@/lib/repositories/asset-categories";

function formatError(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    switch (error.message) {
      case "CATEGORY_NOT_FOUND":
        return { status: 404, message: "资产类别不存在。" };
      case "CATEGORY_IN_USE":
        return { status: 400, message: "该类别正在被资产使用，无法删除。" };
      default:
        return { status: 400, message: error.message };
    }
  }
  return { status: 500, message: "服务器内部错误" };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const category = getAssetCategoryById(id);
  if (!category) {
    return NextResponse.json(
      { error: "CATEGORY_NOT_FOUND", message: "资产类别不存在。" },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: category });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  try {
    const payload = await request.json();
    const category = updateAssetCategory(id, {
      labelZh: typeof payload.labelZh === "string" ? payload.labelZh : undefined,
      labelEn: typeof payload.labelEn === "string" ? payload.labelEn : undefined,
      description:
        typeof payload.description === "string" ? payload.description : undefined,
      color: typeof payload.color === "string" ? payload.color : undefined,
    });
    return NextResponse.json({ data: category });
  } catch (error) {
    const formatted = formatError(error);
    return NextResponse.json(
      {
        error: "CATEGORY_UPDATE_FAILED",
        message: formatted.message,
      },
      { status: formatted.status },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  try {
    deleteAssetCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = formatError(error);
    return NextResponse.json(
      {
        error: "CATEGORY_DELETE_FAILED",
        message: formatted.message,
      },
      { status: formatted.status },
    );
  }
}



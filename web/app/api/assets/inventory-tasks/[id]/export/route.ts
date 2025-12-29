import { NextResponse } from "next/server";
import { getInventoryTaskById } from "@/lib/repositories/inventory-tasks";
import { listAssets } from "@/lib/repositories/assets";
import type { AssetStatus } from "@/lib/types/asset";
import { ASSET_STATUSES } from "@/lib/types/asset";
import { buildWorkbookBufferFromAoA } from "@/lib/utils/xlsx";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { searchParams } = new URL(request.url);
  const lang = (searchParams.get("lang") ?? "en").toLowerCase();
  const isChinese = lang === "zh";
  const { id } = await params;
  const task = getInventoryTaskById(id);
  if (!task) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "盘点任务不存在。" },
      { status: 404 },
    );
  }

  const filters = task.filters ?? {};
  const statusFilter =
    Array.isArray(filters.status) && filters.status.length > 0
      ? (filters.status as string[]).filter(
          (status): status is AssetStatus =>
            ASSET_STATUSES.includes(status as AssetStatus),
        )
      : undefined;

  const result = listAssets({
    page: 1,
    pageSize: 1000,
    status: statusFilter,
    category:
      typeof filters.category === "string" && filters.category.trim()
        ? filters.category.trim()
        : undefined,
    search:
      typeof filters.search === "string" && filters.search.trim()
        ? filters.search.trim()
        : undefined,
  });

  if (result.items.length === 0) {
    return NextResponse.json(
      { error: "NO_DATA", message: "没有符合条件的资产。" },
      { status: 404 },
    );
  }

  const headers = isChinese
    ? ["资产编号", "资产名称", "类别", "状态", "使用人", "存放位置", "购买日期"]
    : ["assetNo", "name", "category", "status", "owner", "location", "purchaseDate"];
  const rows = result.items.map((asset) =>
    isChinese
      ? [
          asset.assetNo ?? asset.id,
          asset.name,
          asset.category,
          asset.status,
          asset.owner,
          asset.location,
          asset.purchaseDate,
        ]
      : [
          asset.assetNo ?? asset.id,
          asset.name,
          asset.category,
          asset.status,
          asset.owner,
          asset.location,
          asset.purchaseDate,
        ],
  );

  const buffer = buildWorkbookBufferFromAoA(
    isChinese ? "盘点清单" : "Inventory",
    [headers, ...rows],
  );
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inventory-${task.id}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

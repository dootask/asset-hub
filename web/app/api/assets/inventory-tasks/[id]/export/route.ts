import { NextResponse } from "next/server";
import { getInventoryTaskById } from "@/lib/repositories/inventory-tasks";
import { listAssets } from "@/lib/repositories/assets";
import type { AssetStatus } from "@/lib/types/asset";
import { ASSET_STATUSES } from "@/lib/types/asset";

function toCsv(rows: Record<string, string>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const data = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    ),
  ];
  return data.join("\n");
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
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

  const rows = result.items.map((asset) => ({
    assetNo: asset.assetNo ?? asset.id,
    name: asset.name,
    category: asset.category,
    status: asset.status,
    owner: asset.owner,
    location: asset.location,
    purchaseDate: asset.purchaseDate,
  }));

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-${task.id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { listAssets } from "@/lib/repositories/assets";
import type { AssetStatus } from "@/lib/types/asset";
import { ASSET_STATUSES } from "@/lib/types/asset";

function parseStatuses(searchParams: URLSearchParams): AssetStatus[] | undefined {
  const rawStatuses = [
    ...searchParams.getAll("status"),
    ...(searchParams.get("status")?.split(",") ?? []),
  ].filter(Boolean);

  const normalized = Array.from(new Set(rawStatuses)).filter((value) =>
    ASSET_STATUSES.includes(value as AssetStatus),
  ) as AssetStatus[];

  return normalized.length ? normalized : undefined;
}

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const status = parseStatuses(searchParams);
  const company = searchParams.get("company") ?? undefined;
  const normalizedCompany =
    company && company.trim().length > 0 ? company.trim().toUpperCase() : undefined;

  const result = listAssets({
    page: 1,
    pageSize: 1000,
    search: search?.trim() || undefined,
    category: category?.trim() || undefined,
    companyCode: normalizedCompany,
    status,
  });

  if (result.items.length === 0) {
    return NextResponse.json(
      { error: "NO_DATA", message: "没有可导出的资产数据。" },
      { status: 404 },
    );
  }

  const rows = result.items.map((asset) => ({
    id: asset.id,
    name: asset.name,
    category: asset.category,
    status: asset.status,
    companyCode: asset.companyCode ?? "",
    owner: asset.owner,
    location: asset.location,
    purchaseDate: asset.purchaseDate,
  }));

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assets-export.csv"`,
      "Cache-Control": "no-store",
    },
  });
}



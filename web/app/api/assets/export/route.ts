import { NextResponse } from "next/server";
import { listAssets } from "@/lib/repositories/assets";
import type { AssetStatus } from "@/lib/types/asset";
import { ASSET_STATUSES, ASSET_STATUS_LABELS } from "@/lib/types/asset";
import { formatCentsToMoney } from "@/lib/utils/money";
import { buildWorkbookBufferFromAoA } from "@/lib/utils/xlsx";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = (searchParams.get("lang") ?? "en").toLowerCase();
  const isChinese = lang === "zh";
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

  const headers = isChinese
    ? [
        "资产名称",
        "资产编号",
        "规格型号",
        "公司编码",
        "资产类别",
        "状态",
        "使用人",
        "存放位置",
        "购买日期",
        "过期时间",
        "采购价格",
        "采购币种",
        "备注",
      ]
    : [
        "name",
        "assetNo",
        "specModel",
        "companyCode",
        "category",
        "status",
        "owner",
        "location",
        "purchaseDate",
        "expiresAt",
        "purchasePrice",
        "purchaseCurrency",
        "note",
      ];
  const rows = result.items.map((asset) =>
    isChinese
      ? [
          asset.name,
          asset.assetNo ?? asset.id,
          asset.specModel ?? "",
          asset.companyCode ?? "",
          asset.category,
          ASSET_STATUS_LABELS[asset.status]?.zh ?? asset.status,
          asset.owner,
          asset.location,
          asset.purchaseDate,
          asset.expiresAt ?? "",
          formatCentsToMoney(asset.purchasePriceCents),
          asset.purchaseCurrency ?? "CNY",
          asset.note ?? "",
        ]
      : [
          asset.name,
          asset.assetNo ?? asset.id,
          asset.specModel ?? "",
          asset.companyCode ?? "",
          asset.category,
          asset.status,
          asset.owner,
          asset.location,
          asset.purchaseDate,
          asset.expiresAt ?? "",
          formatCentsToMoney(asset.purchasePriceCents),
          asset.purchaseCurrency ?? "CNY",
          asset.note ?? "",
        ],
  );

  const buffer = buildWorkbookBufferFromAoA(
    isChinese ? "资产导出" : "Assets",
    [headers, ...rows],
  );
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="assets-export.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

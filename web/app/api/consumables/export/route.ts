import { NextResponse } from "next/server";
import { listConsumables } from "@/lib/repositories/consumables";
import type { ConsumableStatus } from "@/lib/types/consumable";
import {
  CONSUMABLE_STATUSES,
  CONSUMABLE_STATUS_LABELS,
} from "@/lib/types/consumable";
import { formatCentsToMoney } from "@/lib/utils/money";
import { buildWorkbookBufferFromAoA } from "@/lib/utils/xlsx";

const STATUS_ALLOW_LIST = new Set<ConsumableStatus>(CONSUMABLE_STATUSES);

function parseStatus(value: string | null): ConsumableStatus[] | undefined {
  if (!value) return undefined;
  const statuses = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => STATUS_ALLOW_LIST.has(entry as ConsumableStatus));
  return statuses.length ? (statuses as ConsumableStatus[]) : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = (searchParams.get("lang") ?? "en").toLowerCase();
  const isChinese = lang === "zh";
  const companyParam = searchParams.get("company");
  const normalizedCompany =
    companyParam && companyParam.trim().length > 0
      ? companyParam.trim().toUpperCase()
      : undefined;
  const result = listConsumables({
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    companyCode: normalizedCompany,
    status: parseStatus(searchParams.get("status")),
    page: 1,
    pageSize: 1000,
  });
  if (result.items.length === 0) {
    return NextResponse.json(
      { error: "NO_DATA", message: "没有可导出的耗材数据。" },
      { status: 404 },
    );
  }
  const headers = isChinese
    ? [
        "耗材名称",
        "耗材编号",
        "规格型号",
        "公司编码",
        "耗材类别",
        "数量",
        "单位",
        "保管人",
        "存放位置",
        "安全库存",
        "状态",
        "采购价格",
        "采购币种",
        "备注",
      ]
    : [
        "name",
        "consumableNo",
        "specModel",
        "companyCode",
        "category",
        "quantity",
        "unit",
        "keeper",
        "location",
        "safetyStock",
        "status",
        "purchasePrice",
        "purchaseCurrency",
        "description",
      ];
  const rows = result.items.map((item) =>
    isChinese
      ? [
          item.name,
          item.consumableNo ?? item.id,
          item.specModel ?? "",
          item.companyCode ?? "",
          item.category,
          item.quantity,
          item.unit,
          item.keeper,
          item.location,
          item.safetyStock,
          CONSUMABLE_STATUS_LABELS[item.status]?.zh ?? item.status,
          formatCentsToMoney(item.purchasePriceCents),
          item.purchaseCurrency ?? "CNY",
          item.description ?? "",
        ]
      : [
          item.name,
          item.consumableNo ?? item.id,
          item.specModel ?? "",
          item.companyCode ?? "",
          item.category,
          item.quantity,
          item.unit,
          item.keeper,
          item.location,
          item.safetyStock,
          item.status,
          formatCentsToMoney(item.purchasePriceCents),
          item.purchaseCurrency ?? "CNY",
          item.description ?? "",
        ],
  );
  const buffer = buildWorkbookBufferFromAoA(
    isChinese ? "耗材导出" : "Consumables",
    [headers, ...rows],
  );
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="consumables-export.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

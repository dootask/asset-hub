import { NextResponse } from "next/server";
import {
  queryConsumableOperations,
} from "@/lib/repositories/consumable-operations";
import { buildConsumableOperationQuery } from "@/lib/utils/consumable-operation-query";
import { buildWorkbookBufferFromAoA } from "@/lib/utils/xlsx";

function buildSheetRows(
  rows: ReturnType<typeof queryConsumableOperations>["items"],
  summary: ReturnType<typeof queryConsumableOperations>["summary"],
  lang: string,
) {
  const isChinese = lang === "zh";
  const headers = isChinese
    ? [
        "操作ID",
        "类型",
        "状态",
        "耗材",
        "类别",
        "保管人",
        "操作人",
        "数量变化",
        "预留变化",
        "说明",
        "创建时间",
      ]
    : [
        "Operation ID",
        "Type",
        "Status",
        "Consumable",
        "Category",
        "Keeper",
        "Actor",
        "Quantity Delta",
        "Reserved Delta",
        "Description",
        "Created At",
      ];

  const lines: Array<Array<string | number>> = [headers];

  rows.forEach((row) => {
    lines.push([
      row.id,
      row.type,
      row.status,
      row.consumableName,
      row.consumableCategory,
      row.keeper ?? "",
      row.actor,
      row.quantityDelta,
      row.reservedDelta,
      row.description,
      row.createdAt,
    ]);
  });

  lines.push([]);
  lines.push([isChinese ? "汇总" : "Summary"]);
  lines.push([isChinese ? "操作总数" : "Total Operations", summary.totalOperations]);
  lines.push([isChinese ? "待处理操作" : "Pending Operations", summary.pendingOperations]);
  lines.push([isChinese ? "入库数量" : "Inbound Quantity", summary.inboundQuantity]);
  lines.push([isChinese ? "出库数量" : "Outbound Quantity", summary.outboundQuantity]);
  lines.push([isChinese ? "净变化" : "Net Quantity", summary.netQuantity]);

  return lines;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = (searchParams.get("lang") ?? "en").toLowerCase();
  const query = buildConsumableOperationQuery(searchParams);
  const result = queryConsumableOperations(query, { all: true });

  const sheetRows = buildSheetRows(result.items, result.summary, lang);
  const filename = `consumable-operations-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;
  const buffer = buildWorkbookBufferFromAoA(
    lang === "zh" ? "耗材操作" : "Consumable Operations",
    sheetRows,
  );
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

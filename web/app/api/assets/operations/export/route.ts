import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { buildWorkbookBufferFromAoA } from "@/lib/utils/xlsx";

type Row = {
  id: string;
  type: string;
  status: string;
  asset_id: string;
  asset_no: string | null;
  asset_name: string;
  asset_category: string;
  asset_status: string;
  company_code: string | null;
  owner: string | null;
  location: string | null;
  actor: string;
  description: string;
  created_at: string;
};

function buildSheetRows(rows: Row[], lang: string) {
  const isChinese = lang === "zh";
  const headers = isChinese
    ? [
        "操作ID",
        "类型",
        "状态",
        "资产ID",
        "资产编号",
        "资产名称",
        "类别",
        "资产状态",
        "公司",
        "使用人",
        "存放位置",
        "操作人",
        "说明",
        "创建时间",
      ]
    : [
        "Operation ID",
        "Type",
        "Status",
        "Asset ID",
        "Asset No",
        "Asset Name",
        "Category",
        "Asset Status",
        "Company",
        "Owner",
        "Location",
        "Actor",
        "Description",
        "Created At",
      ];

  const lines: Array<Array<string | number>> = [headers];
  rows.forEach((row) => {
    lines.push([
      row.id,
      row.type,
      row.status,
      row.asset_id,
      row.asset_no ?? "",
      row.asset_name,
      row.asset_category,
      row.asset_status,
      row.company_code ?? "",
      row.owner ?? "",
      row.location ?? "",
      row.actor,
      row.description,
      row.created_at,
    ]);
  });

  const summary = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      acc.status[row.status] = (acc.status[row.status] ?? 0) + 1;
      acc.type[row.type] = (acc.type[row.type] ?? 0) + 1;
      return acc;
    },
    {
      total: 0,
      status: {} as Record<string, number>,
      type: {} as Record<string, number>,
    },
  );

  lines.push([]);
  lines.push([isChinese ? "汇总" : "Summary"]);
  lines.push([isChinese ? "操作总数" : "Total Operations", summary.total]);
  Object.entries(summary.status)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([status, count]) => {
      lines.push([`${isChinese ? "状态" : "Status"}:${status}`, count]);
    });
  Object.entries(summary.type)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([type, count]) => {
      lines.push([`${isChinese ? "类型" : "Type"}:${type}`, count]);
    });

  return lines;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = (searchParams.get("lang") ?? "en").toLowerCase();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         ao.id,
         ao.type,
         ao.status,
         ao.actor,
         ao.description,
         ao.created_at,
         a.id as asset_id,
         a.asset_no,
         a.name as asset_name,
         a.category as asset_category,
         a.status as asset_status,
         a.company_code,
         a.owner,
         a.location
       FROM asset_operations ao
       JOIN assets a ON a.id = ao.asset_id
       WHERE ao.deleted_at IS NULL AND a.deleted_at IS NULL
       ORDER BY ao.created_at DESC`,
    )
    .all() as Row[];

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "NO_DATA", message: "没有可导出的资产操作记录。" },
      { status: 404 },
    );
  }

  const sheetRows = buildSheetRows(rows, lang);
  const filename = `asset-operations-${new Date().toISOString().slice(0, 10)}.xlsx`;

  const buffer = buildWorkbookBufferFromAoA(
    lang === "zh" ? "资产操作" : "Asset Operations",
    sheetRows,
  );
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

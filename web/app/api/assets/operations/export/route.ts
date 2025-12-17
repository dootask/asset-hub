import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

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

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = typeof value === "string" ? value : value.toString();
  if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildCsvContent(rows: Row[]) {
  const headers = [
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

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(
      [
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
      ]
        .map(escapeCsvValue)
        .join(","),
    );
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

  lines.push("");
  lines.push("Summary");
  lines.push(`Total Operations,${summary.total}`);
  Object.entries(summary.status)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([status, count]) => {
      lines.push(`Status:${status},${count}`);
    });
  Object.entries(summary.type)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([type, count]) => {
      lines.push(`Type:${type},${count}`);
    });

  return lines.join("\n");
}

export async function GET() {
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
       ORDER BY ao.created_at DESC`,
    )
    .all() as Row[];

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "NO_DATA", message: "没有可导出的资产操作记录。" },
      { status: 404 },
    );
  }

  const csv = buildCsvContent(rows);
  const filename = `asset-operations-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}


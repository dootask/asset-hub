import { NextResponse } from "next/server";
import { listConsumables } from "@/lib/repositories/consumables";
import type { ConsumableStatus } from "@/lib/types/consumable";
import { CONSUMABLE_STATUSES } from "@/lib/types/consumable";

const STATUS_ALLOW_LIST = new Set<ConsumableStatus>(CONSUMABLE_STATUSES);

function parseStatus(value: string | null): ConsumableStatus[] | undefined {
  if (!value) return undefined;
  const statuses = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => STATUS_ALLOW_LIST.has(entry as ConsumableStatus));
  return statuses.length ? (statuses as ConsumableStatus[]) : undefined;
}

function toCsv(rows: Record<string, string | number>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? "");
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = listConsumables({
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
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
  const rows = result.items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    status: item.status,
    quantity: item.quantity,
    unit: item.unit,
    keeper: item.keeper,
    location: item.location,
    safetyStock: item.safetyStock,
  }));
  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="consumables-export.csv"',
      "Cache-Control": "no-store",
    },
  });
}


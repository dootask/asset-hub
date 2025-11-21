import { NextResponse } from "next/server";
import {
  queryConsumableOperations,
} from "@/lib/repositories/consumable-operations";
import { buildConsumableOperationQuery } from "@/lib/utils/consumable-operation-query";

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue =
    typeof value === "string" ? value : value.toString();
  if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildCsvContent(
  rows: ReturnType<typeof queryConsumableOperations>["items"],
  summary: ReturnType<typeof queryConsumableOperations>["summary"],
) {
  const headers = [
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

  const lines = [headers.join(",")];

  rows.forEach((row) => {
    lines.push(
      [
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
      ]
        .map(escapeCsvValue)
        .join(","),
    );
  });

  lines.push("");
  lines.push("Summary");
  lines.push(`Total Operations,${summary.totalOperations}`);
  lines.push(`Pending Operations,${summary.pendingOperations}`);
  lines.push(`Inbound Quantity,${summary.inboundQuantity}`);
  lines.push(`Outbound Quantity,${summary.outboundQuantity}`);
  lines.push(`Net Quantity,${summary.netQuantity}`);

  return lines.join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = buildConsumableOperationQuery(searchParams);
  const result = queryConsumableOperations(query, { all: true });

  const csv = buildCsvContent(result.items, result.summary);
  const filename = `consumable-operations-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}


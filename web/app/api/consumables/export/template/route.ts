import { NextResponse } from "next/server";

const HEADERS = [
  "consumableNo",
  "name",
  "specModel",
  "category",
  "status",
  "companyCode",
  "quantity",
  "unit",
  "keeper",
  "location",
  "safetyStock",
  "purchasePrice",
  "purchaseCurrency",
  "description",
];

export async function GET() {
  const csv = `${HEADERS.join(",")}\n`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="consumables-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";

const TEMPLATE_HEADERS = [
  "assetNo",
  "name",
  "specModel",
  "category",
  "status",
  "companyCode",
  "owner",
  "location",
  "purchaseDate",
  "purchasePrice",
  "purchaseCurrency",
];

export async function GET() {
  const csv = `${TEMPLATE_HEADERS.join(",")}\n`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="assets-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}

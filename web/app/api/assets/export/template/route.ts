import { NextResponse } from "next/server";
import { buildWorkbookBufferFromAoA } from "@/lib/utils/xlsx";

const TEMPLATE_HEADERS_EN = [
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

const TEMPLATE_HEADERS_ZH = [
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
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = (searchParams.get("lang") ?? "en").toLowerCase();
  const headers = lang === "zh" ? TEMPLATE_HEADERS_ZH : TEMPLATE_HEADERS_EN;
  const sheetName = lang === "zh" ? "资产模板" : "Assets";
  const buffer = buildWorkbookBufferFromAoA(sheetName, [headers]);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="assets-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { buildWorkbookBufferFromAoA } from "@/lib/utils/xlsx";

const TEMPLATE_HEADERS_EN = [
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

const TEMPLATE_HEADERS_ZH = [
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
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = (searchParams.get("lang") ?? "en").toLowerCase();
  const headers = lang === "zh" ? TEMPLATE_HEADERS_ZH : TEMPLATE_HEADERS_EN;
  const sheetName = lang === "zh" ? "耗材模板" : "Consumables";
  const buffer = buildWorkbookBufferFromAoA(sheetName, [headers]);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="consumables-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import type { ConsumableStatus } from "@/lib/types/consumable";
import { createConsumable, isConsumableNoInUse } from "@/lib/repositories/consumables";
import { getCompanyByCode } from "@/lib/repositories/companies";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";
import { coerceMoneyToCents } from "@/lib/utils/money";

const REQUIRED_HEADERS = [
  "name",
  "category",
  "companyCode",
  "quantity",
  "unit",
  "keeper",
  "location",
  "safetyStock",
] as const;

type ParsedRow = {
  consumableNo?: string;
  name: string;
  specModel?: string;
  category: string;
  companyCode: string;
  quantity: number;
  unit: string;
  keeper: string;
  location: string;
  safetyStock: number;
  purchasePriceCents?: number | null;
  purchaseCurrency?: string;
  description?: string;
  status?: "archived";
};

function normalizeHeaderName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function normalizeStatusInput(value?: string): "archived" | undefined {
  if (!value) return undefined;
  const normalized = normalizeHeaderName(value);
  if (normalized === "archived" || normalized === "归档") return "archived";
  return undefined;
}

function deriveStatus(
  quantity: number,
  safetyStock: number,
  statusInput?: "archived",
): ConsumableStatus {
  if (statusInput === "archived") return "archived";
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= safetyStock) return "low-stock";
  return "in-stock";
}

export function parseConsumableImportContent(content: string) {
  const errors: string[] = [];
  const trimmed = content.trim();
  if (!trimmed) {
    return { rows: [] as ParsedRow[], errors: ["文件内容为空"] };
  }
  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length);
  if (lines.length <= 1) {
    return { rows: [] as ParsedRow[], errors: ["缺少数据行"] };
  }

  lines[0] = lines[0].replace(/^\uFEFF/, "");
  const headers = splitCsvLine(lines[0]).map((cell) => cell.trim());
  const normalizedHeaders = headers.map(normalizeHeaderName);
  const missing = REQUIRED_HEADERS.filter(
    (header) => !normalizedHeaders.includes(normalizeHeaderName(header)),
  );
  if (missing.length) {
    errors.push(`缺少字段: ${missing.join(", ")}`);
    return { rows: [] as ParsedRow[], errors };
  }

  const rows: ParsedRow[] = [];
  lines.slice(1).forEach((line, index) => {
    const cells = splitCsvLine(line);
    const rowNumber = index + 2;
    const record: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      record[normalizeHeaderName(header)] = (cells[cellIndex] ?? "").trim();
    });
    const missingRequired = REQUIRED_HEADERS.filter(
      (header) => !record[normalizeHeaderName(header)],
    );
    if (missingRequired.length) {
      errors.push(
        `第 ${rowNumber} 行缺少字段: ${missingRequired.join(", ")}`,
      );
      return;
    }
    const companyCode = record.companycode?.trim().toUpperCase();
    if (!companyCode) {
      errors.push(`第 ${rowNumber} 行缺少字段: companyCode`);
      return;
    }
    const quantity = Number(record.quantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      errors.push(`第 ${rowNumber} 行 quantity 无效`);
      return;
    }
    const safetyStock = Number(record.safetystock);
    if (Number.isNaN(safetyStock) || safetyStock < 0) {
      errors.push(`第 ${rowNumber} 行 safetyStock 无效`);
      return;
    }

    const rawPurchasePrice = record.purchaseprice?.trim() ?? "";
    const purchasePriceCents = coerceMoneyToCents(rawPurchasePrice);
    if (rawPurchasePrice && purchasePriceCents === null) {
      errors.push(`第 ${rowNumber} 行的采购价格无效: ${record.purchaseprice}`);
      return;
    }

    const rawCurrency = record.purchasecurrency?.trim();
    const purchaseCurrency = rawCurrency ? rawCurrency.toUpperCase() : "CNY";
    if (purchaseCurrency.length > 10) {
      errors.push(`第 ${rowNumber} 行的币种不合法: ${record.purchasecurrency}`);
      return;
    }

    rows.push({
      consumableNo: record.consumableno?.trim() ?? "",
      name: record.name,
      specModel: record.specmodel?.trim() ?? "",
      category: record.category,
      companyCode,
      quantity,
      unit: record.unit,
      keeper: record.keeper,
      location: record.location,
      safetyStock,
      purchasePriceCents,
      purchaseCurrency,
      description: record.description || undefined,
      status: normalizeStatusInput(record.status),
    });
  });

  return { rows, errors };
}

async function readCsvContent(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv")) {
    return request.text();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (file instanceof File) {
      return file.text();
    }
    if (typeof file === "string") {
      return file;
    }
    return null;
  } catch (error) {
    console.error("Failed to parse formData for consumable import:", error);
    return request.text();
  }
}

export async function POST(request: Request) {
  try {
    const text = await readCsvContent(request);
    if (!text) {
      return NextResponse.json(
        {
          error: "FILE_REQUIRED",
          message: "请上传 CSV 文件。",
        },
        { status: 400 },
      );
    }
    const { rows, errors } = parseConsumableImportContent(text);
    if (!rows.length && errors.length) {
      return NextResponse.json(
        {
          error: "INVALID_FILE",
          message: errors.join("；"),
        },
        { status: 400 },
      );
    }

    let imported = 0;
    const aggregatedErrors = [...errors];
    const seenConsumableNos = new Set<string>();
    const categoryIndex = new Map<string, string>();
    listConsumableCategories().forEach((category) => {
      categoryIndex.set(category.code.toLowerCase(), category.code);
      categoryIndex.set(category.labelEn.trim().toLowerCase(), category.code);
      categoryIndex.set(category.labelZh.trim().toLowerCase(), category.code);
    });

    rows.forEach((row) => {
      const consumableNo = row.consumableNo?.trim();
      if (consumableNo) {
        const key = consumableNo.toLowerCase();
        if (seenConsumableNos.has(key) || isConsumableNoInUse(consumableNo)) {
          aggregatedErrors.push(`耗材编号已存在: ${consumableNo}`);
          return;
        }
        seenConsumableNos.add(key);
      }

      const categoryKey = row.category?.trim().toLowerCase();
      const normalizedCategory = categoryKey
        ? categoryIndex.get(categoryKey)
        : null;
      if (!normalizedCategory) {
        aggregatedErrors.push(`耗材类别不存在: ${row.category}`);
        return;
      }
      if (!row.companyCode || !getCompanyByCode(row.companyCode as string)) {
        aggregatedErrors.push(`公司编码不存在: ${row.companyCode ?? ""}`);
        return;
      }
      const status = deriveStatus(row.quantity, row.safetyStock, row.status);
      createConsumable({
        consumableNo: row.consumableNo?.trim() || undefined,
        name: row.name,
        specModel: row.specModel?.trim() || undefined,
        category: normalizedCategory,
        status,
        companyCode: row.companyCode,
        quantity: row.quantity,
        unit: row.unit,
        keeper: row.keeper,
        location: row.location,
        safetyStock: row.safetyStock,
        purchasePriceCents: row.purchasePriceCents,
        purchaseCurrency: row.purchaseCurrency ?? "CNY",
        description: row.description,
      });
      imported += 1;
    });

    return NextResponse.json({
      data: {
        imported,
        skipped: aggregatedErrors.length,
        errors: aggregatedErrors,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "IMPORT_FAILED",
        message:
          error instanceof Error ? error.message : "导入失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}

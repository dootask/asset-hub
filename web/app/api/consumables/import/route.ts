import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { ConsumableStatus, CreateConsumablePayload } from "@/lib/types/consumable";
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

type HeaderKey =
  | "consumableNo"
  | "name"
  | "specModel"
  | "companyCode"
  | "category"
  | "quantity"
  | "unit"
  | "keeper"
  | "location"
  | "safetyStock"
  | "status"
  | "purchasePrice"
  | "purchaseCurrency"
  | "description";

const HEADER_MAP = new Map<string, HeaderKey>([
  ["consumableno", "consumableNo"],
  ["耗材编号", "consumableNo"],
  ["编号", "consumableNo"],
  ["name", "name"],
  ["consumablename", "name"],
  ["耗材名称", "name"],
  ["名称", "name"],
  ["specmodel", "specModel"],
  ["规格型号", "specModel"],
  ["companycode", "companyCode"],
  ["公司编码", "companyCode"],
  ["category", "category"],
  ["耗材类别", "category"],
  ["类别", "category"],
  ["quantity", "quantity"],
  ["数量", "quantity"],
  ["unit", "unit"],
  ["单位", "unit"],
  ["keeper", "keeper"],
  ["保管人", "keeper"],
  ["location", "location"],
  ["存放位置", "location"],
  ["位置", "location"],
  ["safetystock", "safetyStock"],
  ["安全库存", "safetyStock"],
  ["status", "status"],
  ["状态", "status"],
  ["purchaseprice", "purchasePrice"],
  ["采购价格", "purchasePrice"],
  ["purchasecurrency", "purchaseCurrency"],
  ["采购币种", "purchaseCurrency"],
  ["description", "description"],
  ["备注", "description"],
  ["说明", "description"],
]);

function normalizeHeaderName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function resolveHeaderKey(value: unknown): HeaderKey | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = normalizeHeaderName(raw);
  return HEADER_MAP.get(normalized) ?? null;
}

function normalizeCellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
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

function parseNumberCell(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseConsumableImportRows(rows: unknown[][]) {
  const errors: string[] = [];
  if (!rows.length) {
    return { rows: [] as ParsedRow[], errors: ["文件内容为空"] };
  }

  const headerRow = rows[0] ?? [];
  const resolvedHeaders = headerRow.map(resolveHeaderKey);
  const missing = REQUIRED_HEADERS.filter(
    (header) => !resolvedHeaders.includes(header),
  );
  if (missing.length) {
    errors.push(`缺少字段: ${missing.join(", ")}`);
    return { rows: [] as ParsedRow[], errors };
  }

  const hasData = rows.slice(1).some((cells) =>
    (cells ?? []).some((cell) => normalizeCellString(cell)),
  );
  if (!hasData) {
    return { rows: [] as ParsedRow[], errors: ["缺少数据行"] };
  }

  const parsedRows: ParsedRow[] = [];
  rows.slice(1).forEach((cells, index) => {
    const hasContent = (cells ?? []).some((cell) =>
      normalizeCellString(cell),
    );
    if (!hasContent) return;

    const rowNumber = index + 2;
    const record: Record<string, unknown> = {};
    resolvedHeaders.forEach((key, cellIndex) => {
      if (!key) return;
      record[key] = cells?.[cellIndex];
    });

    const missingRequired = REQUIRED_HEADERS.filter(
      (header) => !normalizeCellString(record[header]),
    );
    if (missingRequired.length) {
      errors.push(
        `第 ${rowNumber} 行缺少字段: ${missingRequired.join(", ")}`,
      );
      return;
    }

    const companyCode = normalizeCellString(record.companyCode).toUpperCase();
    if (!companyCode) {
      errors.push(`第 ${rowNumber} 行缺少字段: companyCode`);
      return;
    }

    const quantity = parseNumberCell(record.quantity);
    if (quantity === null || quantity < 0) {
      errors.push(`第 ${rowNumber} 行 quantity 无效`);
      return;
    }
    const safetyStock = parseNumberCell(record.safetyStock);
    if (safetyStock === null || safetyStock < 0) {
      errors.push(`第 ${rowNumber} 行 safetyStock 无效`);
      return;
    }

    const rawPurchasePrice = normalizeCellString(record.purchasePrice);
    const purchasePriceCents = coerceMoneyToCents(rawPurchasePrice);
    if (rawPurchasePrice && purchasePriceCents === null) {
      errors.push(
        `第 ${rowNumber} 行的采购价格无效: ${normalizeCellString(record.purchasePrice)}`,
      );
      return;
    }

    const rawCurrency = normalizeCellString(record.purchaseCurrency);
    const purchaseCurrency = rawCurrency ? rawCurrency.toUpperCase() : "CNY";
    if (purchaseCurrency.length > 10) {
      errors.push(
        `第 ${rowNumber} 行的币种不合法: ${normalizeCellString(record.purchaseCurrency)}`,
      );
      return;
    }

    parsedRows.push({
      consumableNo: normalizeCellString(record.consumableNo),
      name: normalizeCellString(record.name),
      specModel: normalizeCellString(record.specModel),
      category: normalizeCellString(record.category),
      companyCode,
      quantity,
      unit: normalizeCellString(record.unit),
      keeper: normalizeCellString(record.keeper),
      location: normalizeCellString(record.location),
      safetyStock,
      purchasePriceCents,
      purchaseCurrency,
      description: normalizeCellString(record.description) || undefined,
      status: normalizeStatusInput(normalizeCellString(record.status)),
    });
  });

  return { rows: parsedRows, errors };
}

type ImportPayload = {
  rows: unknown[][];
  allOrNothing: boolean;
};

async function readXlsxPayload(request: Request): Promise<ImportPayload | null> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return null;
    }
    const allOrNothing =
      String(formData.get("allOrNothing") ?? "").trim() !== "0";
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return null;
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: "",
    }) as unknown[][];
    return { rows, allOrNothing };
  } catch (error) {
    console.error("Failed to parse XLSX for consumable import:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readXlsxPayload(request);
    if (!payload) {
      return NextResponse.json(
        {
          error: "FILE_REQUIRED",
          message: "请上传 XLSX 文件。",
        },
        { status: 400 },
      );
    }
    const { rows: parsedRows, errors } = parseConsumableImportRows(payload.rows);
    if (!parsedRows.length && errors.length) {
      return NextResponse.json(
        {
          error: "INVALID_FILE",
          message: errors.join("\n"),
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

    const validRows: CreateConsumablePayload[] = [];
    parsedRows.forEach((row) => {
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
      validRows.push({
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
    });

    if (payload.allOrNothing && aggregatedErrors.length > 0) {
      return NextResponse.json(
        {
          error: "IMPORT_ABORTED",
          message: aggregatedErrors.join("\n"),
          data: {
            imported: 0,
            skipped: parsedRows.length,
            errors: aggregatedErrors,
          },
        },
        { status: 400 },
      );
    }

    validRows.forEach((row) => {
      createConsumable(row);
      imported += 1;
    });

    return NextResponse.json({
      data: {
        imported,
        skipped: parsedRows.length - imported,
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

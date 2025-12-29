import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createAsset, isAssetNoInUse } from "@/lib/repositories/assets";
import { ASSET_STATUSES, ASSET_STATUS_LABELS, type AssetStatus } from "@/lib/types/asset";
import type { CreateAssetPayload } from "@/lib/types/asset";
import { getCompanyByCode } from "@/lib/repositories/companies";
import { listAssetCategories } from "@/lib/repositories/asset-categories";
import { coerceMoneyToCents } from "@/lib/utils/money";

const REQUIRED_HEADERS = [
  "name",
  "category",
  "status",
  "companyCode",
  "owner",
  "location",
] as const;

type ParsedRow = CreateAssetPayload;

type HeaderKey =
  | "name"
  | "assetNo"
  | "specModel"
  | "companyCode"
  | "category"
  | "status"
  | "owner"
  | "location"
  | "purchaseDate"
  | "expiresAt"
  | "purchasePrice"
  | "purchaseCurrency"
  | "note";

const HEADER_MAP = new Map<string, HeaderKey>([
  ["name", "name"],
  ["assetname", "name"],
  ["assetsname", "name"],
  ["资产名称", "name"],
  ["名称", "name"],
  ["assetno", "assetNo"],
  ["资产编号", "assetNo"],
  ["编号", "assetNo"],
  ["specmodel", "specModel"],
  ["规格型号", "specModel"],
  ["companycode", "companyCode"],
  ["公司编码", "companyCode"],
  ["category", "category"],
  ["资产类别", "category"],
  ["类别", "category"],
  ["status", "status"],
  ["状态", "status"],
  ["owner", "owner"],
  ["使用人", "owner"],
  ["负责人", "owner"],
  ["location", "location"],
  ["存放位置", "location"],
  ["位置", "location"],
  ["purchasedate", "purchaseDate"],
  ["购买日期", "purchaseDate"],
  ["采购日期", "purchaseDate"],
  ["expiresat", "expiresAt"],
  ["过期时间", "expiresAt"],
  ["purchaseprice", "purchasePrice"],
  ["采购价格", "purchasePrice"],
  ["purchasecurrency", "purchaseCurrency"],
  ["采购币种", "purchaseCurrency"],
  ["note", "note"],
  ["备注", "note"],
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

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeDateValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return formatDateParts(parsed.y, parsed.m, parsed.d);
    }
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\//g, "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const formatted = formatDateParts(year, month, day);
  const parsed = new Date(`${formatted}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : formatted;
}

function normalizeCellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  return String(value).trim();
}

function normalizeStatus(value: string): AssetStatus | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const slug = trimmed.toLowerCase().replace(/[\s_]/g, "-");
  if (ASSET_STATUSES.includes(slug as AssetStatus)) {
    return slug as AssetStatus;
  }

  const lower = trimmed.toLowerCase();
  const matchFromLabel = ASSET_STATUSES.find((status) => {
    const label = ASSET_STATUS_LABELS[status];
    return (
      label?.en.toLowerCase() === lower ||
      label?.zh.toLowerCase() === lower
    );
  });
  return matchFromLabel ?? null;
}

export function parseAssetImportRows(rows: unknown[][]) {
  const errors: string[] = [];
  if (!rows.length) {
    return { rows: [] as ParsedRow[], errors: ["文件内容为空"] };
  }

  const headerRow = rows[0] ?? [];
  const resolvedHeaders = headerRow.map(resolveHeaderKey);
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !resolvedHeaders.includes(header),
  );
  if (missingHeaders.length) {
    errors.push(`缺少字段: ${missingHeaders.join(", ")}`);
    return { rows: [] as ParsedRow[], errors };
  }

  const hasData = rows.slice(1).some((cells) =>
    (cells ?? []).some((cell) => normalizeCellString(cell)),
  );
  if (!hasData) {
    return { rows: [] as ParsedRow[], errors: ["缺少数据行"] };
  }

  const parsedRows: ParsedRow[] = [];
  rows.slice(1).forEach((cells, lineIndex) => {
    const hasContent = (cells ?? []).some((cell) =>
      normalizeCellString(cell),
    );
    if (!hasContent) return;

    const record: Record<string, unknown> = {};
    resolvedHeaders.forEach((key, idx) => {
      if (!key) return;
      record[key] = cells?.[idx];
    });

    const rowNumber = lineIndex + 2;
    const missingRequired = REQUIRED_HEADERS.filter((header) =>
      !normalizeCellString(record[header]),
    );
    if (missingRequired.length) {
      errors.push(
        `第 ${rowNumber} 行缺少字段: ${missingRequired.join(", ")}`,
      );
      return;
    }

    const status = normalizeStatus(normalizeCellString(record.status));
    if (!status) {
      errors.push(
        `第 ${rowNumber} 行的状态值无效: ${normalizeCellString(record.status)}`,
      );
      return;
    }

    const companyCode = normalizeCellString(record.companyCode).toUpperCase();
    if (!companyCode) {
      errors.push(`第 ${rowNumber} 行缺少字段: companyCode`);
      return;
    }

    const rawPurchaseDate = normalizeCellString(record.purchaseDate);
    const purchaseDateValue = rawPurchaseDate
      ? normalizeDateValue(record.purchaseDate)
      : "";
    if (rawPurchaseDate && !purchaseDateValue) {
      errors.push(`第 ${rowNumber} 行的购买日期格式无效: ${rawPurchaseDate}`);
      return;
    }
    const purchaseDate = purchaseDateValue ?? "";

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

    const rawExpiresAt = normalizeCellString(record.expiresAt);
    const expiresAt = rawExpiresAt ? normalizeDateValue(record.expiresAt) : null;
    if (rawExpiresAt && !expiresAt) {
      errors.push(
        `第 ${rowNumber} 行的过期时间格式无效: ${normalizeCellString(record.expiresAt)}`,
      );
      return;
    }

    parsedRows.push({
      assetNo: normalizeCellString(record.assetNo),
      name: normalizeCellString(record.name),
      specModel: normalizeCellString(record.specModel),
      category: normalizeCellString(record.category),
      status,
      companyCode,
      owner: normalizeCellString(record.owner),
      location: normalizeCellString(record.location),
      purchaseDate,
      expiresAt: expiresAt ?? "",
      note: normalizeCellString(record.note),
      purchasePriceCents,
      purchaseCurrency,
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
    console.error("Failed to parse XLSX for asset import:", error);
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

    const { rows: parsedRows, errors } = parseAssetImportRows(payload.rows);

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
    const seenAssetNos = new Set<string>();
    const categoryIndex = new Map<string, string>();
    listAssetCategories().forEach((category) => {
      categoryIndex.set(category.code.toLowerCase(), category.code);
      categoryIndex.set(category.labelEn.trim().toLowerCase(), category.code);
      categoryIndex.set(category.labelZh.trim().toLowerCase(), category.code);
    });

    const validRows: ParsedRow[] = [];
    parsedRows.forEach((row) => {
      const assetNo = row.assetNo?.trim();
      if (assetNo) {
        const key = assetNo.toLowerCase();
        if (seenAssetNos.has(key) || isAssetNoInUse(assetNo)) {
          aggregatedErrors.push(`资产编号已存在: ${assetNo}`);
          return;
        }
        seenAssetNos.add(key);
      }

      const categoryKey = row.category?.trim().toLowerCase();
      const normalizedCategory = categoryKey
        ? categoryIndex.get(categoryKey)
        : null;
      if (!normalizedCategory) {
        aggregatedErrors.push(`资产类别不存在: ${row.category}`);
        return;
      }
      if (!getCompanyByCode(row.companyCode)) {
        aggregatedErrors.push(`公司编码不存在: ${row.companyCode}`);
        return;
      }
      validRows.push({ ...row, category: normalizedCategory });
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
      createAsset(row);
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

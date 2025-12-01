import { NextResponse } from "next/server";
import { createAsset } from "@/lib/repositories/assets";
import { ASSET_STATUSES, ASSET_STATUS_LABELS, type AssetStatus } from "@/lib/types/asset";
import type { CreateAssetPayload } from "@/lib/types/asset";
import { getCompanyByCode } from "@/lib/repositories/companies";
import { listAssetCategories } from "@/lib/repositories/asset-categories";

const REQUIRED_HEADERS = [
  "name",
  "category",
  "status",
  "companyCode",
  "owner",
  "location",
  "purchaseDate",
] as const;

type ParsedRow = CreateAssetPayload;

async function readCsvContent(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";
  // Allow direct text/csv uploads (no multipart) to be more tolerant with different clients.
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
    // formData parsing may fail if boundary is missing; fall back to treating body as text.
    console.error("Failed to parse formData for asset import:", error);
    return request.text();
  }
}

function normalizeHeaderName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function normalizeStatus(value: string): AssetStatus | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const slug = trimmed.toLowerCase().replace(/[\s_]/g, "-");
  if (ASSET_STATUSES.includes(slug as AssetStatus)) {
    return slug as AssetStatus;
  }

  // 支持中英文展示标签（如 “待入库”/“Pending”）
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

function splitCsvLine(line: string): string[] {
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

export function parseAssetImportContent(content: string) {
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
  const requiredKeys = REQUIRED_HEADERS.map(normalizeHeaderName);
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !normalizedHeaders.includes(normalizeHeaderName(header)),
  );
  if (missingHeaders.length) {
    errors.push(`缺少字段: ${missingHeaders.join(", ")}`);
    return { rows: [] as ParsedRow[], errors };
  }

  const rows: ParsedRow[] = [];
  lines.slice(1).forEach((line, lineIndex) => {
    const cells = splitCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const normalized = normalizeHeaderName(header);
      record[normalized] = cells[idx]?.trim() ?? "";
    });

    const rowNumber = lineIndex + 2;
    const missingRequired = requiredKeys.filter(
      (header) => !record[header],
    );
    if (missingRequired.length) {
      errors.push(
        `第 ${rowNumber} 行缺少字段: ${missingRequired
          .map((key) => REQUIRED_HEADERS[requiredKeys.indexOf(key)])
          .join(", ")}`,
      );
      return;
    }

    const status = normalizeStatus(record.status);
    if (!status) {
      errors.push(`第 ${rowNumber} 行的状态值无效: ${record.status}`);
      return;
    }

    const companyCode = record.companycode?.trim().toUpperCase();
    if (!companyCode) {
      errors.push(`第 ${rowNumber} 行缺少字段: companyCode`);
      return;
    }
    rows.push({
      name: record.name,
      category: record.category,
      status,
      companyCode,
      owner: record.owner,
      location: record.location,
      purchaseDate: record.purchasedate,
    });
  });

  return { rows, errors };
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

    const { rows, errors } = parseAssetImportContent(text);

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
    const categoryIndex = new Map<string, string>();
    listAssetCategories().forEach((category) => {
      categoryIndex.set(category.code.toLowerCase(), category.code);
      categoryIndex.set(category.labelEn.trim().toLowerCase(), category.code);
      categoryIndex.set(category.labelZh.trim().toLowerCase(), category.code);
    });

    rows.forEach((row) => {
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
      createAsset({ ...row, category: normalizedCategory });
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

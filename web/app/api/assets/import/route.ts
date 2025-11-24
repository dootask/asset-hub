import { NextResponse } from "next/server";
import { createAsset } from "@/lib/repositories/assets";
import { ASSET_STATUSES, type AssetStatus } from "@/lib/types/asset";
import type { CreateAssetPayload } from "@/lib/types/asset";
import { getCompanyByCode } from "@/lib/repositories/companies";

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

function normalizeStatus(value: string): AssetStatus | null {
  const normalized = value.trim().toLowerCase().replace(/[\s_]/g, "-");
  const match = ASSET_STATUSES.find(
    (status) => status === normalized,
  ) as AssetStatus | undefined;
  return match ?? null;
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
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
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
      record[header] = cells[idx]?.trim() ?? "";
    });

    const rowNumber = lineIndex + 2;
    const missingRequired = REQUIRED_HEADERS.filter(
      (header) => !record[header],
    );
    if (missingRequired.length) {
      errors.push(
        `第 ${rowNumber} 行缺少字段: ${missingRequired.join(", ")}`,
      );
      return;
    }

    const status = normalizeStatus(record.status);
    if (!status) {
      errors.push(`第 ${rowNumber} 行的状态值无效: ${record.status}`);
      return;
    }

    const companyCode = record.companyCode?.trim().toUpperCase();
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
      purchaseDate: record.purchaseDate,
    });
  });

  return { rows, errors };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "FILE_REQUIRED",
          message: "请上传 CSV 文件。",
        },
        { status: 400 },
      );
    }

    const text = await file.text();
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
    rows.forEach((row) => {
      if (!getCompanyByCode(row.companyCode)) {
        aggregatedErrors.push(`公司编码不存在: ${row.companyCode}`);
        return;
      }
      createAsset(row);
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


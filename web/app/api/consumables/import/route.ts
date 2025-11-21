import { NextResponse } from "next/server";
import {
  CONSUMABLE_STATUSES,
  type ConsumableStatus,
} from "@/lib/types/consumable";
import { createConsumable } from "@/lib/repositories/consumables";

const STATUS_ALLOW_LIST = new Set<ConsumableStatus>(CONSUMABLE_STATUSES);
const REQUIRED_HEADERS = [
  "name",
  "category",
  "status",
  "quantity",
  "unit",
  "keeper",
  "location",
  "safetyStock",
] as const;

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

export function parseConsumableImportContent(content: string) {
  const errors: string[] = [];
  const trimmed = content.trim();
  if (!trimmed) {
    return { rows: [] as Record<string, string>[], errors: ["文件内容为空"] };
  }
  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length);
  if (lines.length <= 1) {
    return { rows: [] as Record<string, string>[], errors: ["缺少数据行"] };
  }

  lines[0] = lines[0].replace(/^\uFEFF/, "");
  const headers = splitCsvLine(lines[0]).map((cell) => cell.trim());
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) {
    errors.push(`缺少字段: ${missing.join(", ")}`);
    return { rows: [] as Record<string, string>[], errors };
  }

  const rows: Record<string, string>[] = [];
  lines.slice(1).forEach((line, index) => {
    const cells = splitCsvLine(line);
    const rowNumber = index + 2;
    const record: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      record[header] = (cells[cellIndex] ?? "").trim();
    });
    const missingRequired = REQUIRED_HEADERS.filter((header) => !record[header]);
    if (missingRequired.length) {
      errors.push(`第 ${rowNumber} 行缺少字段: ${missingRequired.join(", ")}`);
      return;
    }
    if (!STATUS_ALLOW_LIST.has(record.status as ConsumableStatus)) {
      errors.push(`第 ${rowNumber} 行状态不合法: ${record.status}`);
      return;
    }
    if (Number.isNaN(Number(record.quantity)) || Number(record.quantity) < 0) {
      errors.push(`第 ${rowNumber} 行 quantity 无效`);
      return;
    }
    if (Number.isNaN(Number(record.safetyStock)) || Number(record.safetyStock) < 0) {
      errors.push(`第 ${rowNumber} 行 safetyStock 无效`);
      return;
    }
    rows.push(record);
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
    rows.forEach((row) => {
      createConsumable({
        name: row.name,
        category: row.category,
        status: row.status as ConsumableStatus,
        quantity: Number(row.quantity),
        unit: row.unit,
        keeper: row.keeper,
        location: row.location,
        safetyStock: Number(row.safetyStock),
        description: row.description || undefined,
      });
      imported += 1;
    });

    return NextResponse.json({
      data: {
        imported,
        skipped: errors.length,
        errors,
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


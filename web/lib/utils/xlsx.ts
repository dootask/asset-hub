import * as XLSX from "xlsx";

export type XlsxCellValue = string | number | boolean | null;
export type XlsxRow = XlsxCellValue[];

export function buildWorkbookBufferFromAoA(
  sheetName: string,
  rows: XlsxRow[],
): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function buildWorkbookBufferFromRecords(
  sheetName: string,
  rows: Array<Record<string, XlsxCellValue>>,
  headers?: string[],
): ArrayBuffer {
  const resolvedHeaders =
    headers ?? Object.keys(rows[0] ?? {});
  const data: XlsxRow[] = [
    resolvedHeaders,
    ...rows.map((row) =>
      resolvedHeaders.map((header) => row[header] ?? ""),
    ),
  ];
  return buildWorkbookBufferFromAoA(sheetName, data);
}

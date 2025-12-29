"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import type { AssetCategory } from "@/lib/types/asset-category";
import type { Company } from "@/lib/types/system";
import { ASSET_STATUSES, type AssetStatus } from "@/lib/types/asset";
import { getApiClient } from "@/lib/http/client";
import { downloadWithDooTask } from "@/lib/utils/download";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { Upload } from "lucide-react";

interface Props {
  locale: string;
  categories: AssetCategory[];
  companies: Company[];
}

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

const ALL_CATEGORIES_VALUE = "__all__";
const ALL_COMPANIES_VALUE = "__all_companies__";

export default function AssetImportExportClient({ locale, categories, companies }: Props) {
  const isChinese = locale === "zh";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [company, setCompany] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<AssetStatus>>(
    () => new Set(),
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [allOrNothing, setAllOrNothing] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (category) {
      params.set("category", category);
    }
    if (company) {
      params.set("company", company);
    }
    Array.from(selectedStatuses).forEach((status) =>
      params.append("status", status),
    );
    const query = params.toString();
    return `/apps/asset-hub/api/assets/export${query ? `?${query}` : ""}`;
  }, [search, category, company, selectedStatuses]);

  const templateHref = "/apps/asset-hub/api/assets/export/template";

  const handleStatusToggle = (status: AssetStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedFile = selectedFiles[0] ?? null;
    if (!selectedFile) {
      setImportError(
        isChinese ? "请选择要导入的 XLSX 文件。" : "Please choose an XLSX file.",
      );
      setImportResult(null);
      return;
    }
    setUploading(true);
    setImportError(null);
    setImportResult(null);
    try {
      const client = await getApiClient();
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("allOrNothing", allOrNothing ? "1" : "0");
      const response = await client.post<{
        data?: ImportResult;
        message?: string;
      }>("/apps/asset-hub/api/assets/import", formData);
      const payload = response.data;
      setImportResult(payload.data ?? null);
    } catch (error) {
      setImportError(
        extractApiErrorMessage(
          error,
          isChinese ? "导入失败，请稍后重试。" : "Import failed. Please try again.",
        ),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (files: File[]) => {
    setSelectedFiles(files.slice(0, 1));
    setImportError(null);
    setImportResult(null);
  };

  const handleDownloadExport = () => downloadWithDooTask(exportHref);
  const handleDownloadTemplate = () => downloadWithDooTask(templateHref);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card/70 p-4 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">
            {isChinese ? "导出资产列表" : "Export Assets"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese
              ? "按条件筛选后下载 XLSX，可用于备份或批量编辑。"
              : "Filter the dataset and download an XLSX for backup or bulk editing."}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {isChinese ? "关键词搜索" : "Keyword"}
              </Label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  isChinese ? "资产名称、编号、位置..." : "Name, No., location..."
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {isChinese ? "资产类别" : "Category"}
              </Label>
              <Select
                value={category === "" ? ALL_CATEGORIES_VALUE : category}
                onValueChange={(value) =>
                  setCategory(value === ALL_CATEGORIES_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={isChinese ? "全部类别" : "All categories"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES_VALUE}>
                    {isChinese ? "全部类别" : "All categories"}
                  </SelectItem>
                  {categories.map((entry) => (
                    <SelectItem key={entry.id} value={entry.code}>
                      {isChinese ? entry.labelZh : entry.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {isChinese ? "所属公司" : "Company"}
              </Label>
              <Select
                value={company === "" ? ALL_COMPANIES_VALUE : company}
                onValueChange={(value) =>
                  setCompany(value === ALL_COMPANIES_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={isChinese ? "全部公司" : "All companies"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_COMPANIES_VALUE}>
                    {isChinese ? "全部公司" : "All companies"}
                  </SelectItem>
                  {companies.map((entry) => (
                    <SelectItem key={entry.id} value={entry.code}>
                      {entry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Label className="text-xs text-muted-foreground">
            {isChinese ? "资产状态" : "Status"}
          </Label>
          <div className="flex flex-wrap gap-2 text-sm md:grid-cols-3">
            {ASSET_STATUSES.map((status) => {
              const checkboxId = `asset-status-${status}`;
              return (
                <label
                  key={status}
                  htmlFor={checkboxId}
                  className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2"
                >
                  <Checkbox
                    id={checkboxId}
                    className="border-muted-foreground/40"
                    checked={selectedStatuses.has(status)}
                    onCheckedChange={() => handleStatusToggle(status)}
                  />
                  <span>
                    {isChinese
                      ? status === "pending"
                        ? "待入库"
                        : status === "in-use"
                          ? "使用中"
                          : status === "idle"
                            ? "闲置"
                            : status === "maintenance"
                              ? "维护中"
                              : "已退役"
                      : status}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="default" onClick={handleDownloadExport}>
            {isChinese ? "下载筛选结果" : "Download XLSX"}
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            {isChinese ? "下载模板" : "Download Template"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card/70 p-4 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">
            {isChinese ? "导入资产数据" : "Import Assets"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese
              ? "按照模板填写 XLSX，可一次性导入多条资产记录。"
              : "Fill in the XLSX template to import multiple assets at once."}
          </p>
        </div>
        <form className="mt-4 space-y-4" onSubmit={handleImport}>
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              {isChinese ? "上传 XLSX 文件" : "Upload XLSX file"}
            </Label>
            <FileUpload
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              maxFiles={1}
              multiple={false}
              value={selectedFiles}
              onValueChange={handleFileChange}
              onFileReject={(file, message) =>
                setImportError(`${file.name}: ${message}`)
              }
            >
            <FileUploadDropzone className="w-full">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex items-center justify-center rounded-full border border-dashed p-2.5">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  {isChinese ? "拖拽 XLSX 文件到此处" : "Drag & drop XLSX here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isChinese ? "仅支持单个 XLSX，最多 1 个文件" : "Single XLSX file, max 1"}
                </p>
                <FileUploadTrigger asChild>
                  <Button variant="outline" size="sm" type="button">
                    {isChinese ? "浏览文件" : "Browse files"}
                  </Button>
                </FileUploadTrigger>
              </div>
            </FileUploadDropzone>
            <FileUploadList>
              {selectedFiles.map((file) => (
                <FileUploadItem
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  value={file}
                >
                    <FileUploadItemMetadata size="sm" />
                    <FileUploadItemDelete asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        type="button"
                      >
                        <span className="sr-only">
                          {isChinese ? "移除文件" : "Remove file"}
                        </span>
                        ×
                      </Button>
                    </FileUploadItemDelete>
                  </FileUploadItem>
                ))}
              </FileUploadList>
            </FileUpload>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={allOrNothing}
                onCheckedChange={(checked) => setAllOrNothing(Boolean(checked))}
              />
              {isChinese
                ? "导入中有任意失败则整批作废"
                : "Cancel the entire import if any row fails"}
            </label>
          </div>
          {importError && (
            <p className="text-sm text-destructive whitespace-pre-line">
              {importError}
            </p>
          )}
          {importResult && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-800 dark:text-emerald-200">
              <p>
                {isChinese
                  ? `导入成功 ${importResult.imported} 条，跳过 ${importResult.skipped} 条。`
                  : `Imported ${importResult.imported} rows, skipped ${importResult.skipped}.`}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {importResult.errors.map((error, index) => (
                    <li key={`${index}-${error}`}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={uploading}
              className="rounded-2xl px-6"
            >
              {uploading
                ? isChinese
                  ? "正在导入..."
                  : "Importing..."
                : isChinese
                  ? "开始导入"
                  : "Import"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {isChinese
                ? "导入完成后可在资产列表中查看新建记录。"
                : "After the import, review the newly created assets in the list."}
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}

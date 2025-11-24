"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConsumableCategory } from "@/lib/types/consumable";
import type { Company } from "@/lib/types/system";
import {
  CONSUMABLE_STATUS_LABELS,
  CONSUMABLE_STATUSES,
} from "@/lib/types/consumable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiClient } from "@/lib/http/client";

interface Props {
  locale: string;
  categories: ConsumableCategory[];
  companies: Company[];
}

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export default function ConsumableImportExportClient({ locale, categories, companies }: Props) {
  const isChinese = locale === "zh";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [company, setCompany] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (company) params.set("company", company);
    const query = params.toString();
    return `/apps/asset-hub/api/consumables/export${query ? `?${query}` : ""}`;
  }, [search, category, status, company]);

  const templateHref = "/apps/asset-hub/api/consumables/export/template";

  const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setImportError(isChinese ? "请选择 CSV 文件" : "Please select a CSV file");
      setImportResult(null);
      return;
    }
    setUploading(true);
    setImportResult(null);
    setImportError(null);
    try {
      const client = await getApiClient();
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await client.post<{
        data: ImportResult;
        message?: string;
      }>("/apps/asset-hub/api/consumables/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(response.data.data);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : isChinese
            ? "导入失败，请稍后再试。"
            : "Import failed, please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card/70 p-4 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">
            {isChinese ? "导出耗材数据" : "Export consumables"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese ? "按条件筛选后导出 CSV，以便备份或批量维护。" : "Filter consumables and export to CSV for backup or bulk editing."}
          </p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{isChinese ? "关键词" : "Keyword"}</Label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isChinese ? "耗材名称、保管人..." : "Name, keeper..."}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isChinese ? "类别" : "Category"}</Label>
            <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isChinese ? "全部" : "All"}</SelectItem>
                {categories.map((entry) => (
                  <SelectItem key={entry.id} value={entry.code}>
                    {isChinese ? entry.labelZh : entry.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isChinese ? "状态" : "Status"}</Label>
            <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? undefined : value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isChinese ? "全部" : "All"}</SelectItem>
            {CONSUMABLE_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                {isChinese ? CONSUMABLE_STATUS_LABELS[value].zh : CONSUMABLE_STATUS_LABELS[value].en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isChinese ? "所属公司" : "Company"}</Label>
            <Select value={company || "all"} onValueChange={(value) => setCompany(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isChinese ? "全部" : "All"}</SelectItem>
                {companies.map((entry) => (
                  <SelectItem key={entry.id} value={entry.code}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button asChild>
            <a href={exportHref} download>
              {isChinese ? "下载 CSV" : "Download CSV"}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={templateHref} download>
              {isChinese ? "下载模板" : "Download template"}
            </a>
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card/70 p-4 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">
            {isChinese ? "导入耗材数据" : "Import consumables"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese ? "使用模板批量导入耗材库存。" : "Use the template to import consumables in bulk."}
          </p>
        </div>
        <form className="mt-4 space-y-4" onSubmit={handleImport}>
          <div className="space-y-1.5">
            <Label>{isChinese ? "选择 CSV 文件" : "Choose CSV file"}</Label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setImportResult(null);
                setImportError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {isChinese
                ? "字段需包含：name, category, status, companyCode, quantity, unit, keeper, location, safetyStock。"
                : "Required columns: name, category, status, companyCode, quantity, unit, keeper, location, safetyStock."}
            </p>
          </div>
          {importError && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {importError}
            </div>
          )}
          {importResult && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
              <p>
                {isChinese
                  ? `成功导入 ${importResult.imported} 条，跳过 ${importResult.skipped} 条。`
                  : `Imported ${importResult.imported} rows, skipped ${importResult.skipped}.`}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  {importResult.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Button type="submit" disabled={uploading} className="rounded-2xl px-4 py-2">
            {uploading
              ? isChinese
                ? "导入中..."
                : "Importing..."
              : isChinese
                ? "开始导入"
                : "Import"}
          </Button>
        </form>
      </section>
    </div>
  );
}

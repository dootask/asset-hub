"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_STATUSES, getAssetStatusLabel } from "@/lib/types/asset";
import type { AssetCategory } from "@/lib/types/asset-category";

export interface AssetFiltersProps {
  initialSearch?: string;
  initialStatus?: string[];
  initialCategory?: string;
  locale?: string;
  categories?: AssetCategory[];
}

export default function AssetFilters({
  initialSearch,
  initialStatus = [],
  initialCategory,
  locale = "en",
  categories = [],
}: AssetFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isChinese = locale === "zh";

  const [search, setSearch] = useState(initialSearch ?? "");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    initialStatus,
  );
  const [category, setCategory] = useState(initialCategory ?? "all");

  const toggleStatus = useCallback((value: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }, []);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }

    if (selectedStatuses.length) {
      params.set("status", selectedStatuses.join(","));
    } else {
      params.delete("status");
    }

    if (category && category !== "all") {
      params.set("category", category);
    } else {
      params.delete("category");
    }

    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [search, selectedStatuses, category, router, pathname, searchParams]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setSelectedStatuses([]);
    setCategory("all");

    const params = new URLSearchParams(searchParams.toString());
    ["search", "status", "category", "page"].forEach((key) => params.delete(key));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  const categoryOptions = useMemo(() => {
    const options = categories.map((category) => ({
      value: category.code,
      label: locale === "zh" ? category.labelZh : category.labelEn,
    }));
    return [{ value: "all", label: isChinese ? "全部" : "All" }, ...options];
  }, [categories, isChinese, locale]);

  return (
    <div className="rounded-2xl border bg-muted/40 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="asset-filter-search" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "关键词" : "Keyword"}
          </Label>
          <Input
            id="asset-filter-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              isChinese ? "资产名称 / 编号 / 使用人" : "Name / ID / Owner"
            }
          />
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="asset-filter-category" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "资产类别" : "Category"}
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="asset-filter-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={applyFilters}
            className="rounded-xl px-4 py-2 text-sm shadow"
          >
            {isChinese ? "应用筛选" : "Apply"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="rounded-xl px-4 py-2 text-sm"
          >
            {isChinese ? "重置" : "Reset"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground">
          {isChinese ? "资产状态" : "Status"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ASSET_STATUSES.map((status) => {
            const checked = selectedStatuses.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  checked
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-dashed border-border text-muted-foreground hover:border-primary/60",
                )}
              >
                {getAssetStatusLabel(status, locale)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


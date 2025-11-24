"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONSUMABLE_STATUS_LABELS } from "@/lib/types/consumable";
import type { ConsumableCategory } from "@/lib/types/consumable";
import type { Company } from "@/lib/types/system";

interface Props {
  locale: string;
  categories: ConsumableCategory[];
  companies: Company[];
}

export default function ConsumableFilters({ locale, categories, companies }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChinese = locale === "zh";

  const statusOptions = useMemo(
    () =>
      Object.entries(CONSUMABLE_STATUS_LABELS).map(([value, label]) => ({
        value,
        label: isChinese ? label.zh : label.en,
      })),
    [isChinese],
  );

  const currentStatus = searchParams.get("status") ?? undefined;
  const currentCategory = searchParams.get("category") ?? undefined;
  const currentCompany = searchParams.get("company") ?? undefined;
  const currentSearch = searchParams.get("search") ?? "";

  const applyFilters = (params: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    next.delete("page");
    router.push(`?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end rounded-2xl border bg-muted/20 p-4">
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {isChinese ? "关键词" : "Keyword"}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            applyFilters({ search: formData.get("search") as string });
          }}
        >
          <Input
            name="search"
            defaultValue={currentSearch}
            placeholder={isChinese ? "耗材名称、保管人或位置" : "Name, keeper, location"}
          />
        </form>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {isChinese ? "状态" : "Status"}
        </p>
        <Select
          value={currentStatus}
          onValueChange={(value) =>
            applyFilters({
              status: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={isChinese ? "全部状态" : "All statuses"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {isChinese ? "全部状态" : "All statuses"}
            </SelectItem>
            {statusOptions.map((option) => (
              <SelectItem value={option.value} key={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
        <div className="flex flex-1 flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {isChinese ? "类别" : "Category"}
        </p>
        <Select
          value={currentCategory}
          onValueChange={(value) =>
            applyFilters({
              category: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={isChinese ? "全部类别" : "All categories"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {isChinese ? "全部类别" : "All categories"}
            </SelectItem>
            {categories.map((category) => (
              <SelectItem value={category.code} key={category.id}>
                {isChinese ? category.labelZh : category.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {isChinese ? "所属公司" : "Company"}
        </p>
        <Select
          value={currentCompany ?? "all"}
          onValueChange={(value) =>
            applyFilters({
              company: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={isChinese ? "全部公司" : "All companies"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {isChinese ? "全部公司" : "All companies"}
            </SelectItem>
            {companies.map((company) => (
              <SelectItem value={company.code} key={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            applyFilters({
              search: undefined,
              status: undefined,
              category: undefined,
              company: undefined,
            })
          }
        >
          {isChinese ? "重置筛选" : "Reset"}
        </Button>
      </div>
    </div>
  );
}


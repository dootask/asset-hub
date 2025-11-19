"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { APPROVAL_STATUSES, APPROVAL_TYPES } from "@/lib/types/approval";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  locale?: string;
  status?: string;
  type?: string;
}

export default function ApprovalFilters({ locale, status, type }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isChinese = locale === "zh";

  const currentParams = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString());
    return params;
  }, [searchParams]);

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(currentParams.toString());
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isChinese ? "筛选：" : "Filters:"}
      </div>
      <div className="flex flex-1 flex-wrap gap-3">
        <Select
          value={status ?? ""}
          onValueChange={(value) => updateParam("status", value || undefined)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={isChinese ? "全部状态" : "All statuses"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              {isChinese ? "全部状态" : "All statuses"}
            </SelectItem>
            {APPROVAL_STATUSES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type ?? ""}
          onValueChange={(value) => updateParam("type", value || undefined)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={isChinese ? "全部类型" : "All types"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              {isChinese ? "全部类型" : "All types"}
            </SelectItem>
            {APPROVAL_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {isChinese ? item.labelZh : item.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}



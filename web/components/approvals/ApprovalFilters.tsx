"use client";
import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPROVAL_STATUSES, APPROVAL_TYPES } from "@/lib/types/approval";

interface Props {
  locale?: string;
  status?: string;
  type?: string;
}

const ALL_VALUE = "__all__";

export default function ApprovalFilters({ locale = "en", status, type }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isChinese = locale === "zh";

  const [statusValue, setStatusValue] = useState(status ?? ALL_VALUE);
  const [typeValue, setTypeValue] = useState(type ?? ALL_VALUE);
  const statusOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: isChinese ? "全部状态" : "All statuses" },
      ...APPROVAL_STATUSES.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    ],
    [isChinese],
  );

  const typeOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: isChinese ? "全部类型" : "All types" },
      ...APPROVAL_TYPES.map((item) => ({
        value: item.value,
        label: isChinese ? item.labelZh : item.labelEn,
      })),
    ],
    [isChinese],
  );

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (statusValue !== ALL_VALUE) {
      params.set("status", statusValue);
    } else {
      params.delete("status");
    }

    if (typeValue !== ALL_VALUE) {
      params.set("type", typeValue);
    } else {
      params.delete("type");
    }

    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams, statusValue, typeValue]);

  const resetFilters = useCallback(() => {
    setStatusValue(ALL_VALUE);
    setTypeValue(ALL_VALUE);

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    ["status", "type", "role", "userId", "page"].forEach((key) =>
      params.delete(key),
    );
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  return (
    <div className="rounded-2xl border bg-muted/40 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            {isChinese ? "审批状态" : "Status"}
          </Label>
          <Select value={statusValue} onValueChange={setStatusValue}>
            <SelectTrigger className="w-full" data-testid="approval-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            {isChinese ? "审批类型" : "Type"}
          </Label>
          <Select value={typeValue} onValueChange={setTypeValue}>
            <SelectTrigger className="w-full" data-testid="approval-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" onClick={applyFilters} className="rounded-xl px-4 py-2 text-sm shadow">
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

    </div>
  );
}



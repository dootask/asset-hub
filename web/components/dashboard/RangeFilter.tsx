"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { value: 7, labelZh: "近 7 天", labelEn: "Last 7 days" },
  { value: 14, labelZh: "近 14 天", labelEn: "Last 14 days" },
  { value: 30, labelZh: "近 30 天", labelEn: "Last 30 days" },
];

interface Props {
  locale: string;
  value: number;
}

export default function RangeFilter({ locale, value }: Props) {
  const isChinese = locale === "zh";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = useMemo(
    () =>
      RANGE_OPTIONS.map((option) => ({
        ...option,
        active: option.value === value,
      })),
    [value],
  );

  const handleSelect = (nextValue: number) => {
    if (nextValue === value) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (nextValue === 14) {
      params.delete("range");
    } else {
      params.set("range", String(nextValue));
    }
    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    router.replace(target, { scroll: false });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="dashboard-range-filter"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-medium transition",
            option.active
              ? "border-primary text-primary shadow-sm"
              : "border-muted-foreground/30 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => handleSelect(option.value)}
        >
          {isChinese ? option.labelZh : option.labelEn}
        </button>
      ))}
    </div>
  );
}


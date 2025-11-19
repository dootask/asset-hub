"use client";

import clsx from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { value: "all", labelZh: "全部", labelEn: "All" },
  { value: "my-requests", labelZh: "我发起的", labelEn: "My requests" },
  { value: "my-tasks", labelZh: "待我审批", labelEn: "My tasks" },
];

interface Props {
  locale?: string;
  userId?: string;
  currentRole?: "my-requests" | "my-tasks";
}

export default function ApprovalTabs({ locale, userId, currentRole }: Props) {
  const isChinese = locale === "zh";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value === "all") {
      params.delete("role");
    } else {
      params.set("role", value);
      if (userId) {
        params.set("userId", userId);
      }
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active =
          (tab.value === "all" && !currentRole) ||
          tab.value === currentRole;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleSelect(tab.value)}
            className={clsx(
              "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {isChinese ? tab.labelZh : tab.labelEn}
          </button>
        );
      })}
      {!userId && currentRole && (
        <span className="text-xs text-destructive">
          {isChinese
            ? "缺少 userId 参数，无法筛选个人数据。"
            : "Missing userId parameter to filter personal view."}
        </span>
      )}
    </div>
  );
}



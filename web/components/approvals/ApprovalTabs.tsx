"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getUserInfo } from "@dootask/tools";

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
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(userId ?? null);
  const [missingUserWarning, setMissingUserWarning] = useState(false);

  useEffect(() => {
    if (userId) {
      setResolvedUserId(userId);
      return;
    }

    let cancelled = false;

    getUserInfo()
      .then((info) => {
        if (cancelled) return;
        if (info?.userid) {
          setResolvedUserId(String(info.userid));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUserId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value === "all") {
      params.delete("role");
      params.delete("userId");
      setMissingUserWarning(false);
    } else {
      if (!resolvedUserId) {
        setMissingUserWarning(true);
        return;
      }
      params.set("role", value);
      params.set("userId", resolvedUserId);
      setMissingUserWarning(false);
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
      {(missingUserWarning || (!resolvedUserId && currentRole)) && (
        <div className="text-xs text-destructive flex items-center">
          {isChinese
            ? "缺少 userId 参数，无法筛选个人数据。"
            : "Missing userId parameter to filter personal view."}
        </div>
      )}
    </div>
  );
}



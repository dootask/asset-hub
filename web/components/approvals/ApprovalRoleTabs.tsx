"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { getUserInfo } from "@dootask/tools";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { extractApiErrorMessage } from "@/lib/utils/api-error";

type RoleValue = "all" | "my-requests" | "my-tasks";

interface Props {
  locale?: string;
}

const ROLE_OPTIONS: Array<{ value: RoleValue; labelZh: string; labelEn: string }> = [
  { value: "all", labelZh: "全部", labelEn: "All" },
  { value: "my-requests", labelZh: "我发起的", labelEn: "My Requests" },
  { value: "my-tasks", labelZh: "待我审批", labelEn: "My Tasks" },
];

export default function ApprovalRoleTabs({ locale = "en" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loadingRole, setLoadingRole] = useState<RoleValue | null>(null);
  const feedback = useAppFeedback();

  const currentRole: RoleValue = useMemo(() => {
    const role = searchParams?.get("role") ?? "all";
    if (role === "my-requests" || role === "my-tasks") {
      return role;
    }
    return "all";
  }, [searchParams]);

  const isChinese = locale === "zh";

  const handleSelect = useCallback(
    async (role: RoleValue) => {
      if (!router || !pathname) {
        return;
      }
      if (role === currentRole) {
        return;
      }

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.delete("page");
      if (role === "all") {
        params.delete("role");
        params.delete("userId");
        router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
        return;
      }

      setLoadingRole(role);
      try {
        const userInfo = await getUserInfo();
        type GenericUserId = {
          userid?: string | number;
          id?: string | number;
          user_id?: string | number;
          userId?: string | number;
        };
        const normalized = userInfo as GenericUserId;
        const resolvedUserId =
          normalized.userid ??
          normalized.id ??
          normalized.user_id ??
          normalized.userId ??
          "";
        if (!resolvedUserId) {
          throw new Error(
            isChinese ? "无法获取用户信息" : "Failed to resolve user info",
          );
        }
        params.set("role", role);
        params.set("userId", String(resolvedUserId));
        router.push(`${pathname}?${params.toString()}`);
      } catch (err) {
        const message = extractApiErrorMessage(
          err,
          isChinese ? "无法获取用户信息" : "Failed to resolve user info",
        );
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "获取用户信息失败" : "Failed to fetch user",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      } finally {
        setLoadingRole(null);
      }
    },
    [currentRole, feedback, isChinese, pathname, router, searchParams],
  );

  return (
    <div className="space-y-2 rounded-2xl border bg-muted/30 p-3">
      <div className="flex flex-wrap gap-2">
        {ROLE_OPTIONS.map((option) => {
          const active = currentRole === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/90 text-primary-foreground shadow"
                  : "bg-background/70 text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={active}
              onClick={() => void handleSelect(option.value)}
              data-testid={`approval-role-${option.value}`}
            >
              {loadingRole === option.value
                ? isChinese
                  ? "处理中..."
                  : "Loading..."
                : isChinese
                  ? option.labelZh
                  : option.labelEn}
            </button>
          );
        })}
      </div>
    </div>
  );
}

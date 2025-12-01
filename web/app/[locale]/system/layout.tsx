"use client";

import type { ReactNode } from "react";
import { use } from "react";
import { usePermissions } from "@/components/providers/PermissionProvider";
import { Spinner } from "@/components/ui/spinner";

type SystemLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default function SystemLayout({
  children,
  params,
}: SystemLayoutProps) {
  const { locale } = use(params);
  const { isAdmin, userReady } = usePermissions();

  if (!userReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <div className="max-w-md rounded-3xl border bg-card p-6 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Asset Hub
          </p>
          <h1 className="mt-3 text-xl font-semibold">
            {locale === "zh"
              ? "当前账户没有访问系统管理的权限"
              : "You do not have access to System Management"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {locale === "zh"
              ? "请使用管理员账户登录，或联系管理员为你分配权限。"
              : "Use an admin account or ask an admin to grant you access."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import { useRef } from "react";
import PageHeader from "@/components/layout/PageHeader";
import RoleTable, { type RoleTableHandle } from "@/components/system/RoleTable";
import type { Role } from "@/lib/types/system";
import { Button } from "@/components/ui/button";

type Props = {
  locale: string;
  initialRoles: Role[];
};

export default function RoleManagementClient({
  locale,
  initialRoles,
}: Props) {
  const tableRef = useRef<RoleTableHandle>(null);
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/system`,
            labelZh: "系统管理",
            labelEn: "System",
          },
          {
            labelZh: "角色管理",
            labelEn: "Role Management",
          },
        ]}
        title={isChinese ? "角色管理" : "Role Management"}
        description={
          isChinese
            ? "配置不同业务角色与作用域，为审批流程提供依据。"
            : "Configure role scopes to drive approvals and permissions."
        }
        actions={
          <Button
            onClick={() => tableRef.current?.openCreateDialog()}
            className="rounded-2xl px-4 py-2 text-sm"
          >
            {isChinese ? "新增角色" : "New Role"}
          </Button>
        }
      />

      <RoleTable
        ref={tableRef}
        initialRoles={initialRoles}
        locale={locale}
      />
    </div>
  );
}


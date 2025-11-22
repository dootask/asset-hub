"use client";

import { useRef } from "react";
import PageHeader from "@/components/layout/PageHeader";
import CompanyTable, {
  type CompanyTableHandle,
} from "@/components/system/CompanyTable";
import type { Company } from "@/lib/types/system";

type Props = {
  locale: string;
  initialCompanies: Company[];
  baseUrl: string;
};

export default function CompanyManagementClient({
  locale,
  initialCompanies,
  baseUrl,
}: Props) {
  const tableRef = useRef<CompanyTableHandle>(null);
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
            labelZh: "公司管理",
            labelEn: "Companies",
          },
        ]}
        title={isChinese ? "公司管理" : "Company Management"}
        description={
          isChinese
            ? "维护集团与分支机构信息，供资产归属与审批策略引用。"
            : "Maintain company and branch records for asset ownership and approvals."
        }
        actions={
          <button
            type="button"
            onClick={() => tableRef.current?.openCreateDialog()}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
          >
            {isChinese ? "新增公司" : "New Company"}
          </button>
        }
      />

      <CompanyTable
        ref={tableRef}
        initialCompanies={initialCompanies}
        locale={locale}
        baseUrl={baseUrl}
      />
    </div>
  );
}



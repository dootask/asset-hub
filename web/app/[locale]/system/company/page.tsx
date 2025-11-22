import type { Metadata } from "next";
import { listCompanies } from "@/lib/repositories/companies";
import { getRequestBaseUrl } from "@/lib/utils/server-url";
import CompanyTable from "@/components/system/CompanyTable";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";

export const metadata: Metadata = {
  title: "公司管理 - Asset Hub",
};

export default async function CompanyManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const companies = listCompanies();
  const baseUrl = await getRequestBaseUrl();
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <header>
        <PageBreadcrumb
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
        />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "公司管理" : "Company Management"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "维护集团与分支机构信息，供资产归属与审批策略引用。"
            : "Maintain company and branch records for asset ownership and approval policies."}
        </p>
      </header>

      <CompanyTable
        initialCompanies={companies}
        locale={locale}
        baseUrl={baseUrl}
      />
    </div>
  );
}

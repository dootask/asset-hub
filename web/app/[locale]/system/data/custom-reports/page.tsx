import type { Metadata } from "next";
import CustomReportsClient from "@/components/system/CustomReportsClient";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
import { listReportViews } from "@/lib/repositories/report-views";
import { getRequestBaseUrl } from "@/lib/utils/server-url";

export const metadata: Metadata = {
  title: "自定义报表 - Asset Hub",
};

export default async function CustomReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const views = listReportViews();
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
              href: `/${locale}/system/data/reports`,
              labelZh: "数据报表",
              labelEn: "Reports",
            },
            {
              labelZh: "自定义报表",
              labelEn: "Custom Reports",
            },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "自定义报表" : "Custom Reports"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "根据资产或审批数据生成个性化报表，并随时预览导出。"
            : "Build personalized asset or approval reports and preview them on demand."}
        </p>
      </header>
      <CustomReportsClient
        locale={locale}
        baseUrl={baseUrl}
        initialViews={views}
      />
    </div>
  );
}


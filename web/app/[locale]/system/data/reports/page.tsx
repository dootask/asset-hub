import { getRequestBaseUrl } from "@/lib/utils/server-url";
import PageHeader from "@/components/layout/PageHeader";
import ReportsClient from "./ReportsClient";
import { listAssetCategories } from "@/lib/repositories/asset-categories";

interface SummaryResponse {
  data: {
    assetsByStatus: { label: string; count: number }[];
    assetsByCategory: { label: string; count: number }[];
    approvalsByStatus: { label: string; count: number }[];
    approvalsByType: { label: string; count: number }[];
    approvalsRecent30d: { label: string; count: number }[];
    operationsByType: { label: string; count: number }[];
  };
}

async function fetchSummary() {
  const baseUrl = await getRequestBaseUrl();
  const response = await fetch(`${baseUrl}/apps/asset-hub/api/reports/summary`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("无法加载报表统计数据");
  }
  return (await response.json()) as SummaryResponse;
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";

  const [summary, categories] = await Promise.all([
    fetchSummary(),
    listAssetCategories(),
  ]);

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
            labelZh: "数据报表",
            labelEn: "Data Reports",
          },
        ]}
        title={isChinese ? "数据与报表" : "Data & Reports"}
        description={
          isChinese
            ? "查看资产业务的聚合指标，并下载 CSV 报表。"
            : "Review aggregated metrics for asset operations and download CSV reports."
        }
      />

      <ReportsClient locale={locale} categories={categories} summary={summary.data} />
    </div>
  );
}



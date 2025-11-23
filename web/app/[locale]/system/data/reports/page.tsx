import PageHeader from "@/components/layout/PageHeader";
import ReportsClient from "./ReportsClient";
import { listAssetCategories } from "@/lib/repositories/asset-categories";
import { getApiClient } from "@/lib/http/client";

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
  const client = await getApiClient();
  const response = await client.get<SummaryResponse>(
    "/apps/asset-hub/api/reports/summary",
    { headers: { "Cache-Control": "no-cache" } },
  );
  return response.data;
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


import PageHeader from "@/components/layout/PageHeader";
import ReportsClient from "./ReportsClient";
import { listAssetCategories } from "@/lib/repositories/asset-categories";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";

  const assetCategories = listAssetCategories();
  const consumableCategories = listConsumableCategories();

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

      <ReportsClient
        locale={locale}
        assetCategories={assetCategories}
        consumableCategories={consumableCategories}
      />
    </div>
  );
}

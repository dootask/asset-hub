import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import ConsumableAlertTable from "@/components/consumables/ConsumableAlertTable";
import { listConsumableAlerts } from "@/lib/repositories/consumable-alerts";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";

export const metadata: Metadata = {
  title: "耗材告警 - Asset Hub",
};

export default async function ConsumableAlertsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  const alerts = listConsumableAlerts({ status: ["open"] });
  const categories = listConsumableCategories();

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/consumables`,
            labelZh: "耗材管理",
            labelEn: "Consumables",
          },
          {
            labelZh: "告警",
            labelEn: "Alerts",
          },
        ]}
        title={isChinese ? "耗材告警" : "Consumable Alerts"}
        description={
          isChinese
            ? "查看低库存、缺货提醒，并同步处理进度。"
            : "Track low-stock and out-of-stock notifications."
        }
        actions={
          <div className="rounded-2xl border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            {isChinese
              ? `已配置 ${categories.length} 个耗材类别`
              : `${categories.length} consumable categories configured`}
          </div>
        }
      />

      <ConsumableAlertTable locale={locale} alerts={alerts} />
    </div>
  );
}


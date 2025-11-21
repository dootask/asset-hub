import type { Metadata } from "next";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";

export const metadata: Metadata = {
  title: "耗材盘点 - Asset Hub",
};

export default async function ConsumableInventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <header>
        <PageBreadcrumb
          locale={locale}
          items={[
            {
              href: `/${locale}/consumables`,
              labelZh: "耗材管理",
              labelEn: "Consumables",
            },
            {
              labelZh: "盘点",
              labelEn: "Inventory",
            },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold">
          {isChinese ? "耗材盘点（预留）" : "Consumable Inventory (Preview)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isChinese
            ? "用于展示耗材盘点任务与导出入口，功能正在建设中。"
            : "Placeholder for consumable inventory tasks and exports."}
        </p>
      </header>
      <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        {isChinese
          ? "耗材盘点功能将在后续版本上线。"
          : "Consumable inventory support is coming soon."}
      </div>
    </div>
  );
}


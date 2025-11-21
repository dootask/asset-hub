import type { Metadata } from "next";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";

export const metadata: Metadata = {
  title: "耗材操作 - Asset Hub",
};

export default async function ConsumableOperationsPage({
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
              labelZh: "操作流程",
              labelEn: "Operations",
            },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold">
          {isChinese ? "耗材操作流程（预留）" : "Consumable Operations (Preview)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isChinese
            ? "将在后续版本中接入耗材采购、入库、出库等流程。"
            : "Future versions will enable purchase, inbound, and outbound workflows for consumables."}
        </p>
      </header>
      <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        {isChinese
          ? "耗材操作流程正在规划中。"
          : "Consumable operations are under planning."}
      </div>
    </div>
  );
}

